import { NextRequest, NextResponse } from "next/server";
import { generateRoomId } from "@/lib/utils";
import { getLanguageById } from "@/lib/languages";

// In-memory store for fallback API queries
const inMemoryRooms = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedLanguage = body.language || "javascript";
    const languageConfig = getLanguageById(requestedLanguage);
    const initialCode = body.code || languageConfig.defaultCode;
    const title = body.title || "Untitled Room";
    const roomCode = body.customCode || generateRoomId();

    const room = {
      roomCode,
      title,
      language: requestedLanguage,
      code: initialCode,
      createdAt: new Date().toISOString(),
    };

    inMemoryRooms.set(roomCode, room);

    return NextResponse.json(
      {
        success: true,
        roomCode: room.roomCode,
        language: room.language,
        code: room.code,
        createdAt: room.createdAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create room", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const roomsList = Array.from(inMemoryRooms.values());
  return NextResponse.json({ success: true, rooms: roomsList });
}
