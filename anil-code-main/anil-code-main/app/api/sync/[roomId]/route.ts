import { NextRequest, NextResponse } from "next/server";

// Serverless in-memory room store (persists across warm lambda invocations)
declare global {
  // eslint-disable-next-line no-var
  var serverlessRooms:
    | Map<
        string,
        {
          code: string;
          language: string;
          version: number;
          lastUpdated: number;
          users: Map<string, number>;
        }
      >
    | undefined;
}

const rooms =
  global.serverlessRooms ||
  new Map<
    string,
    {
      code: string;
      language: string;
      version: number;
      lastUpdated: number;
      users: Map<string, number>;
    }
  >();

if (process.env.NODE_ENV !== "production") {
  global.serverlessRooms = rooms;
}

function getOrInitRoom(roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      code: "// Welcome to anil6!\n// Collaborate on code and notes in real time.\n\nfunction helloWorld() {\n  console.log('Hello from anil6!');\n}\n\nhelloWorld();\n",
      language: "javascript",
      version: 1,
      lastUpdated: Date.now(),
      users: new Map(),
    });
  }
  return rooms.get(roomId)!;
}

// GET /api/sync/[roomId] - Poll or fetch current room state
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  const userId = req.nextUrl.searchParams.get("userId") || "anon";

  const room = getOrInitRoom(roomId);

  // Update user active heartbeat
  room.users.set(userId, Date.now());

  // Cleanup inactive users (older than 10 seconds)
  const now = Date.now();
  for (const [uId, lastSeen] of Array.from(room.users.entries())) {
    if (now - lastSeen > 10000) {
      room.users.delete(uId);
    }
  }

  return NextResponse.json({
    success: true,
    code: room.code,
    language: room.language,
    version: room.version,
    lastUpdated: room.lastUpdated,
    usersCount: Math.max(1, room.users.size),
  });
}

// POST /api/sync/[roomId] - Broadcast code or language update
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const body = await req.json();
    const { code, language, userId } = body;

    const room = getOrInitRoom(roomId);

    if (userId) {
      room.users.set(userId, Date.now());
    }

    if (code !== undefined && code !== room.code) {
      room.code = code;
      room.version += 1;
      room.lastUpdated = Date.now();
    }

    if (language !== undefined && language !== room.language) {
      room.language = language;
      room.version += 1;
      room.lastUpdated = Date.now();
    }

    return NextResponse.json({
      success: true,
      version: room.version,
      lastUpdated: room.lastUpdated,
      usersCount: Math.max(1, room.users.size),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Sync update failed", details: err.message },
      { status: 500 }
    );
  }
}
