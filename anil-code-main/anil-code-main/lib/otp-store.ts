// Global In-Memory OTP Store and Dispatch Service

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
  method: "resend" | "brevo" | "smtp" | "twilio" | "fast2sms" | "demo_preview";
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

export function verifyOtp(target: string, inputCode: string): { success: boolean; error?: string } {
  const store = getOtpStore();
  const normalized = target.trim().toLowerCase();
  const record = store.get(normalized);

  if (!record) {
    return { success: false, error: "No verification code requested for this Gmail/phone." };
  }

  if (Date.now() > record.expiresAt) {
    store.delete(normalized);
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (record.attempts >= 5) {
    store.delete(normalized);
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  record.attempts += 1;

  if (record.code !== inputCode.trim()) {
    return { success: false, error: "Incorrect verification code. Please check and try again." };
  }

  record.verified = true;
  store.delete(normalized); // Clean up used OTP
  return { success: true };
}

export async function sendVerificationCode(
  target: string,
  code: string,
  roomId: string = "6"
): Promise<SendResult> {
  const cleanTarget = target.trim().toLowerCase();
  const isEmail = cleanTarget.includes("@");

  // 1. RESEND API DISPATCH
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
            success: true,
            delivered: false,
            method: "demo_preview",
            previewCode: code,
            message: `Notice: ${detail}. Use code below.`,
          };
        }
      } catch (err: any) {
        console.error("Resend error:", err.message);
      }
    }
  }

  // 2. MOBILE SMS DELIVERY FLOW
  if (!isEmail) {
    // 2A. FAST2SMS FOR INDIAN NUMBERS
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

    // 2B. TWILIO SMS FOR GLOBAL PHONE NUMBERS
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const formattedNumber = cleanTarget.startsWith("+")
          ? cleanTarget
          : `+91${cleanTarget.replace(/\D/g, "").slice(-10)}`;

        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

        const body = new URLSearchParams({
          To: formattedNumber,
          From: twilioFrom,
          Body: `Your Anil6 verification code is: ${code}. Valid for 10 minutes.`,
        });

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (res.ok) {
          return {
            success: true,
            delivered: true,
            method: "twilio",
            message: `SMS dispatched to ${cleanTarget}! Check your mobile messages.`,
          };
        }
      } catch (twilioErr: any) {
        console.error("Twilio error:", twilioErr.message);
      }
    }
  }

  // 3. DEV / DEMO FALLBACK
  return {
    success: true,
    delivered: false,
    method: "demo_preview",
    previewCode: code,
    message: isEmail
      ? `No Resend API Key configured in .env.local. Use the preview code below.`
      : `No SMS gateway configured in .env.local. Use the preview code below.`,
  };
}
