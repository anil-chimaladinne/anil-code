import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { addVisitorLog } from "@/lib/visitor-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, code, name, roomId } = body;

    if (!target || !code) {
      return NextResponse.json(
        { error: "Target (Gmail or Mobile) and 6-digit Code are required." },
        { status: 400 }
      );
    }

    const cleanTarget = target.trim().toLowerCase();
    const cleanCode = code.trim();

    const verification = await verifyOtp(cleanTarget, cleanCode);
    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    // Determine name & email
    const isEmail = cleanTarget.includes("@");
    const email = isEmail ? cleanTarget : `${cleanTarget.replace(/\D/g, "")}@mobile.anil6`;
    const userName =
      name ||
      (isEmail
        ? cleanTarget.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        : `Mobile User (+${cleanTarget})`);

    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanTarget)}`;

    // Log to visitor store
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
      browser: "Verified Visitor",
      os: "Identified",
      device: isEmail ? "Desktop" : "Mobile",
      page: roomId ? `/${roomId}` : "/",
      referrer: headers.get("referer") || "Direct",
      email: cleanTarget,
      name: userName,
      avatar,
    });

    return NextResponse.json({
      success: true,
      profile: {
        email: cleanTarget,
        name: userName,
        avatar,
        provider: isEmail ? "google" : "custom",
      },
      log,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Verification failed", details: err.message },
      { status: 500 }
    );
  }
}
