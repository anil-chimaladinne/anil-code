import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json({ error: "Missing room ID" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      room: {
        roomCode: roomId,
        title: `Room ${roomId}`,
        code: "",
        language: "javascript",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error fetching room", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const body = await req.json();

    return NextResponse.json({
      success: true,
      room: {
        roomCode: roomId,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update room", details: error.message },
      { status: 500 }
    );
  }
}
