import { NextRequest } from "next/server";
import { getOrInitRoom, subscribeRoom, unsubscribeRoom } from "../route";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  const userId = req.nextUrl.searchParams.get("userId") || "anon";
  const userName = req.nextUrl.searchParams.get("name") || "User";

  const room = getOrInitRoom(roomId);

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial state immediately
      const initialPayload = JSON.stringify({
        type: "init",
        code: room.code,
        language: room.language,
        version: room.version,
        usersCount: Math.max(1, room.users.size),
        activeUsers: Array.from(room.users.values()),
      });
      controller.enqueue(encoder.encode(`data: ${initialPayload}\n\n`));

      // 2. Subscribe to real-time room updates (0ms broadcast)
      const listener = (data: any) => {
        try {
          if (data.senderId !== userId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch {
          // stream closed
        }
      };

      subscribeRoom(roomId, listener);

      // Keep-alive heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribeRoom(roomId, listener);
      };
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
