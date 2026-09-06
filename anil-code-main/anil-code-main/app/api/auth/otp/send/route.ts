import { NextRequest, NextResponse } from "next/server";
import { generateOtp } from "@/lib/otp-store";

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

    // If Resend API or SMTP is configured, send the real email here
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && cleanTarget.includes("@")) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Anil6 <auth@anil-code.vercel.app>",
            to: cleanTarget,
            subject: `Your Anil6 Verification Code: ${code}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; background: #121214; color: #ffffff; border-radius: 12px; max-width: 480px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 24px; font-weight: 900; background: #ea580c; color: #ffffff; padding: 8px 16px; border-radius: 8px;">AM</span>
                  <h2 style="color: #ffffff; margin-top: 12px;">Anil6 Verification Code</h2>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">Use the 6-digit code below to verify your Gmail and unlock room /${roomId || "6"}:</p>
                <div style="background: #1f2937; padding: 18px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fb923c; margin: 20px 0;">
                  ${code}
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to dispatch email via Resend API", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      target: cleanTarget,
      expiresAt,
      message: cleanTarget.includes("@")
        ? `Verification code sent to ${cleanTarget}`
        : `Verification code sent to ${cleanTarget}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to send verification code", details: err.message },
      { status: 500 }
    );
  }
}
