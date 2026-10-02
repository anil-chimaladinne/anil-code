import { NextRequest, NextResponse } from "next/server";
import {
  getOrInitRoom,
  extractUserMetadata,
  broadcastRoomEvent,
} from "@/lib/room-store";

// GET /api/sync/[roomId] - Poll or fetch current room state
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  const userId = req.nextUrl.searchParams.get("userId") || "anon";
  const userEmail = req.nextUrl.searchParams.get("email") || undefined;
  const userName = req.nextUrl.searchParams.get("name") || undefined;
  const userAvatar = req.nextUrl.searchParams.get("avatar") || undefined;

  const room = getOrInitRoom(roomId);

  // Update or register user with full visitor metadata & profile
  const existingUser = room.users.get(userId);
  const updatedUser = extractUserMetadata(req, userId, existingUser, {
    email: userEmail,
    name: userName,
    avatar: userAvatar,
  });
  room.users.set(userId, updatedUser);

  // Cleanup inactive users (older than 12 seconds)
  const now = Date.now();
  for (const [uId, uData] of Array.from(room.users.entries())) {
    if (now - uData.lastSeen > 12000) {
      room.users.delete(uId);
    }
  }

  const activeUsers = Array.from(room.users.values());

  return NextResponse.json({
    success: true,
    code: room.code,
    language: room.language,
    version: room.version,
    lastUpdated: room.lastUpdated,
    usersCount: Math.max(1, activeUsers.length),
    activeUsers,
  });
}

// POST /api/sync/[roomId] - Instant 0ms broadcast code or language update
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const body = await req.json();
    const { code, language, userId, email, name, avatar } = body;

    const room = getOrInitRoom(roomId);

    if (userId) {
      const existingUser = room.users.get(userId);
      const updatedUser = extractUserMetadata(req, userId, existingUser, { email, name, avatar });
      room.users.set(userId, updatedUser);
    }

    let changed = false;

    if (code !== undefined && code !== room.code) {
      room.code = code;
      room.version += 1;
      room.lastUpdated = Date.now();
      changed = true;
    }

    if (language !== undefined && language !== room.language) {
      room.language = language;
      room.version += 1;
      room.lastUpdated = Date.now();
      changed = true;
    }

    const activeUsers = Array.from(room.users.values());

    // Instant SSE Broadcast to all connected users in 0ms!
    if (changed) {
      broadcastRoomEvent(roomId, {
        type: "code-update",
        code: room.code,
        language: room.language,
        version: room.version,
        senderId: userId,
        senderName: name || "User",
        usersCount: Math.max(1, activeUsers.length),
        activeUsers,
      });
    }

    return NextResponse.json({
      success: true,
      version: room.version,
      lastUpdated: room.lastUpdated,
      usersCount: Math.max(1, activeUsers.length),
      activeUsers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Sync update failed", details: err.message },
      { status: 500 }
    );
  }
}
