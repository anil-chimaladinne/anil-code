import { NextRequest } from "next/server";

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

export interface RoomData {
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
  // eslint-disable-next-line no-var
  var roomListeners: Map<string, Set<RoomListener>> | undefined;
}

const rooms = globalThis.serverlessRooms || new Map<string, RoomData>();
globalThis.serverlessRooms = rooms;

export type RoomListener = (data: any) => void;

const listeners = globalThis.roomListeners || new Map<string, Set<RoomListener>>();
globalThis.roomListeners = listeners;

export function subscribeRoom(roomId: string, listener: RoomListener) {
  if (!listeners.has(roomId)) {
    listeners.set(roomId, new Set());
  }
  listeners.get(roomId)!.add(listener);
}

export function unsubscribeRoom(roomId: string, listener: RoomListener) {
  if (listeners.has(roomId)) {
    listeners.get(roomId)!.delete(listener);
  }
}

export function broadcastRoomEvent(roomId: string, data: any) {
  if (listeners.has(roomId)) {
    const roomSet = listeners.get(roomId)!;
    roomSet.forEach((cb) => {
      try {
        cb(data);
      } catch {}
    });
  }
}

export function getOrInitRoom(roomId: string): RoomData {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      code: "",
      language: "javascript",
      version: 1,
      lastUpdated: Date.now(),
      users: new Map(),
    });
  }
  return rooms.get(roomId)!;
}

export function parseUserAgent(ua: string) {
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

export function extractUserMetadata(
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
