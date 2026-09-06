import { NextRequest, NextResponse } from "next/server";
import { addVisitorLog } from "@/lib/visitor-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, avatar, roomId } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const headers = req.headers;
    const forwardedFor = headers.get("x-forwarded-for");
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : headers.get("x-real-ip") || "127.0.0.1";

    const country = headers.get("x-vercel-ip-country") || "Unknown";
    const city = headers.get("x-vercel-ip-city") || "Unknown";
    const region = headers.get("x-vercel-ip-country-region") || "Unknown";

    const log = addVisitorLog({
      ip,
      country: decodeURIComponent(country),
      city: decodeURIComponent(city),
      region: decodeURIComponent(region),
      browser: "Chrome",
      os: "Identified",
      device: "Desktop",
      page: roomId ? `/${roomId}` : "/",
      referrer: headers.get("referer") || "Direct",
      email: email.toLowerCase().trim(),
      name: name || undefined,
      avatar: avatar || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: email.toLowerCase().trim(),
        name: name || email.split("@")[0],
        avatar,
      },
      log,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to authenticate profile", details: err.message },
      { status: 500 }
    );
  }
}
