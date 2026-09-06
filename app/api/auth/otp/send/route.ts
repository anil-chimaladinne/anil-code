import { NextRequest, NextResponse } from "next/server";
import { generateOtp, sendVerificationCode } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, roomId } = body;

    if (!target || typeof target !== "string" || !target.includes("@") || !target.includes(".")) {
      return NextResponse.json(
        { error: "Please enter a valid Gmail / Email address (e.g. yourname@gmail.com)." },
        { status: 400 }
      );
    }

    const cleanTarget = target.trim().toLowerCase();
    const { code, expiresAt } = generateOtp(cleanTarget);

    // Dispatch OTP via configured Gmail SMTP / Resend
    const sendResult = await sendVerificationCode(cleanTarget, code, roomId || "6");

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to dispatch verification code to this email address." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      target: cleanTarget,
      expiresAt,
      delivered: sendResult.delivered,
      method: sendResult.method,
      message: sendResult.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to send verification code", details: err.message },
      { status: 500 }
    );
  }
}
