import { NextRequest, NextResponse } from "next/server";
import { generateOtp, sendVerificationCode } from "@/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, roomId } = body;

    if (!target || typeof target !== "string" || target.trim().length < 3) {
      return NextResponse.json(
        { error: "Please enter a valid Gmail address or mobile number." },
        { status: 400 }
      );
    }

    const cleanTarget = target.trim().toLowerCase();
    const { code, expiresAt } = generateOtp(cleanTarget);

    // Dispatch OTP via configured email/SMS service
    const sendResult = await sendVerificationCode(cleanTarget, code, roomId || "6");

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to dispatch verification code. Please check your address or mobile number." },
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
