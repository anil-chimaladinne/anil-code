import { NextRequest, NextResponse } from "next/server";
import { addVisitorLog } from "@/lib/visitor-store";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const headers = req.headers;

    // IP address resolution (Vercel / Proxy / Standard)
    const forwardedFor = headers.get("x-forwarded-for");
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : headers.get("x-real-ip") || "127.0.0.1";

    // Vercel Geolocation headers
    const country = headers.get("x-vercel-ip-country") || body.country || "Unknown";
    const city = headers.get("x-vercel-ip-city") || body.city || "Unknown";
    const region = headers.get("x-vercel-ip-country-region") || body.region || "Unknown";

    // User Agent parsing
    const userAgent = headers.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(userAgent);

    const log = addVisitorLog({
      ip,
      country: decodeURIComponent(country),
      city: decodeURIComponent(city),
      region: decodeURIComponent(region),
      browser,
      os,
      device,
      page: body.page || "/",
      referrer: body.referrer || headers.get("referer") || "Direct",
      screenSize: body.screenSize,
      language: body.language || headers.get("accept-language")?.split(",")[0] || "Unknown",
      timezone: body.timezone,
      email: body.email || undefined,
      name: body.name || undefined,
      avatar: body.avatar || undefined,
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to track" }, { status: 500 });
  }
}
