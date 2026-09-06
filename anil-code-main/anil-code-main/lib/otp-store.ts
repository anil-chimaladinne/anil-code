// Global In-Memory OTP Store and Multi-Provider Dispatch Service (Email & Mobile SMS)

export interface OtpRecord {
  target: string; // Email or Mobile Number
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

export interface SendResult {
  success: boolean;
  delivered: boolean;
  method: "resend" | "twilio_verify" | "fast2sms" | "twilio_sms" | "demo_preview";
  message: string;
  previewCode?: string;
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __OTP_STORE__: Map<string, OtpRecord> | undefined;
}

function getOtpStore(): Map<string, OtpRecord> {
  if (!global.__OTP_STORE__) {
    global.__OTP_STORE__ = new Map();
  }
  return global.__OTP_STORE__;
}

export function generateOtp(target: string): { code: string; expiresAt: number } {
  const store = getOtpStore();
  const normalized = target.trim().toLowerCase();

  // Generate a secure 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

  store.set(normalized, {
    target: normalized,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return { code, expiresAt };
}

export async function verifyOtp(target: string, inputCode: string): Promise<{ success: boolean; error?: string }> {
  const store = getOtpStore();
  const normalized = target.trim().toLowerCase();
  const cleanCode = inputCode.trim();
  const isEmail = normalized.includes("@");

  // 1. Check in-memory store (used by Email & fallback SMS)
  const record = store.get(normalized);
  if (record) {
    if (Date.now() > record.expiresAt) {
      store.delete(normalized);
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    if (record.attempts >= 5) {
      store.delete(normalized);
      return { success: false, error: "Too many failed attempts. Please request a new code." };
    }

    record.attempts += 1;

    if (record.code === cleanCode) {
      record.verified = true;
      store.delete(normalized);
      return { success: true };
    }
  }

  // 2. If mobile number, also check Twilio Verify API
  if (!isEmail) {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID || "VA0a94d171c4c370da0f6ee06b43bfdf02";

    if (twilioSid && twilioToken && verifySid) {
      try {
        const formattedNumber = normalized.startsWith("+")
          ? normalized
          : `+91${normalized.replace(/\D/g, "").slice(-10)}`;

        const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedNumber,
            Code: cleanCode,
          }).toString(),
        });

        const resData = await res.json();
        console.log("[OTP Service] Twilio VerificationCheck response:", resData);

        if (res.ok && (resData.status === "approved" || resData.valid === true)) {
          if (record) store.delete(normalized);
          return { success: true };
        } else {
          return {
            success: false,
            error: resData.message || "Invalid verification code. Please check your SMS.",
          };
        }
      } catch (err: any) {
        console.error("Twilio Verify Check error:", err.message);
      }
    }
  }

  return { success: false, error: "Incorrect verification code. Please check and try again." };
}

export async function sendVerificationCode(
  target: string,
  code: string,
  roomId: string = "6"
): Promise<SendResult> {
  const cleanTarget = target.trim().toLowerCase();
  const isEmail = cleanTarget.includes("@");

  // ==========================================
  // 1. GMAIL / EMAIL DELIVERY FLOW
  // ==========================================
  if (isEmail) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey.trim().length > 0) {
      try {
        const fromEmail =
          process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Anil6 <${fromEmail}>`,
            to: cleanTarget,
            subject: `Your Anil6 Verification Code: ${code}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; background: #121214; color: #ffffff; border-radius: 12px; max-width: 480px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 24px; font-weight: 900; background: #ea580c; color: #ffffff; padding: 8px 16px; border-radius: 8px;">AM</span>
                  <h2 style="color: #ffffff; margin-top: 12px;">Anil6 Verification Code</h2>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">Use the 6-digit code below to unlock room /${roomId || "6"}:</p>
                <div style="background: #1f2937; padding: 18px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fb923c; margin: 20px 0;">
                  ${code}
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center;">Expires in 10 minutes.</p>
              </div>
            `,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.id) {
          return {
            success: true,
            delivered: true,
            method: "resend",
            message: `Verification code sent to ${cleanTarget} via email!`,
          };
        } else {
          const detail = resData.message || resData.error || "Email delivery failed";
          return {
            success: false,
            delivered: false,
            method: "resend",
            error: `Resend Notice: ${detail}`,
            message: `Notice: ${detail}`,
          };
        }
      } catch (err: any) {
        console.error("Resend error:", err.message);
      }
    }
  }

  // ==========================================
  // 2. MOBILE SMS DELIVERY FLOW
  // ==========================================
  if (!isEmail) {
    // 2A. TWILIO VERIFY SERVICE (Works directly with all Indian mobile numbers)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID || "VA0a94d171c4c370da0f6ee06b43bfdf02";

    if (twilioSid && twilioToken && verifySid) {
      try {
        const formattedNumber = cleanTarget.startsWith("+")
          ? cleanTarget
          : `+91${cleanTarget.replace(/\D/g, "").slice(-10)}`;

        const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedNumber,
            Channel: "sms",
          }).toString(),
        });

        const resData = await res.json();
        console.log("[OTP Service] Twilio Verify dispatch response:", resData);

        if (res.ok && (resData.status === "pending" || resData.sid)) {
          return {
            success: true,
            delivered: true,
            method: "twilio_verify",
            message: `SMS dispatched to ${cleanTarget}! Check your mobile SMS messages.`,
          };
        } else {
          const detail = resData.message || "Twilio SMS dispatch failed";
          return {
            success: false,
            delivered: false,
            method: "twilio_verify",
            error: `SMS Error: ${detail}`,
            message: `SMS Error: ${detail}`,
          };
        }
      } catch (twilioErr: any) {
        console.error("Twilio Verify error:", twilioErr.message);
      }
    }

    // 2B. FAST2SMS FALLBACK
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && fast2smsKey.trim().length > 0) {
      try {
        const rawDigits = cleanTarget.replace(/\D/g, "");
        const mobile10 = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: code,
            numbers: mobile10,
          }),
        });

        const resData = await res.json();
        if (res.ok && (resData.return === true || resData.status_code === 200)) {
          return {
            success: true,
            delivered: true,
            method: "fast2sms",
            message: `SMS dispatched to ${cleanTarget}! Check your mobile messages.`,
          };
        }
      } catch (smsErr: any) {
        console.error("Fast2SMS error:", smsErr.message);
      }
    }

    // If no SMS provider succeeded
    return {
      success: false,
      delivered: false,
      method: "twilio_verify",
      error: "Could not send SMS to this mobile number. Please try Gmail verification.",
      message: "No active SMS provider configured.",
    };
  }

  // Fallback for email
  return {
    success: false,
    delivered: false,
    method: "resend",
    error: "Failed to send email verification code. Please check your Gmail address.",
    message: "Email sending failed.",
  };
}
