import { NextRequest, NextResponse } from "next/server";

export interface ActiveUserDetail {
  userId: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  browser: string;
  os: string;
  device: "Mobile" | "Tablet" | "Desktop" | "Unknown";
  joinedAt: number;
  lastSeen: number;
  email?: string;
  name?: string;
  avatar?: string;
}

interface RoomData {
  code: string;
  language: string;
  version: number;
  lastUpdated: number;
  users: Map<string, ActiveUserDetail>;
}

// Serverless in-memory room store (persistent across all serverless invocations)
declare global {
  // eslint-disable-next-line no-var
  var serverlessRooms: Map<string, RoomData> | undefined;
}

const rooms = globalThis.serverlessRooms || new Map<string, RoomData>();
globalThis.serverlessRooms = rooms;

function parseUserAgent(ua: string) {
  let browser = "Other";
  let os = "Other";
  let device: "Mobile" | "Tablet" | "Desktop" | "Unknown" = "Desktop";

  if (!ua) {
    return { browser: "Unknown", os: "Unknown", device: "Unknown" as const };
  }

  // Device detection
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = "Tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    device = "Mobile";
  } else {
    device = "Desktop";
  }

  // OS detection
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  // Browser detection
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/msie|trident/i.test(ua)) browser = "IE";

  return { browser, os, device };
}

function extractUserMetadata(
  req: NextRequest,
  userId: string,
  existing?: ActiveUserDetail,
  extra?: { email?: string; name?: string; avatar?: string }
): ActiveUserDetail {
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : headers.get("x-real-ip") || "127.0.0.1";

  const country = headers.get("x-vercel-ip-country") || "Unknown";
  const city = headers.get("x-vercel-ip-city") || "Unknown";
  const region = headers.get("x-vercel-ip-country-region") || "Unknown";

  const ua = headers.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(ua);

  return {
    userId,
    ip,
    country: decodeURIComponent(country),
    city: decodeURIComponent(city),
    region: decodeURIComponent(region),
    browser,
    os,
    device,
    joinedAt: existing ? existing.joinedAt : Date.now(),
    lastSeen: Date.now(),
    email: extra?.email || existing?.email || undefined,
    name: extra?.name || existing?.name || undefined,
    avatar: extra?.avatar || existing?.avatar || undefined,
  };
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

// POST /api/sync/[roomId] - Broadcast code or language update
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

    const activeUsers = Array.from(room.users.values());

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
