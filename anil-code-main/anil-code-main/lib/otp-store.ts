// Global In-Memory OTP Store and Email Dispatch Service
// Sends verification codes to any valid Gmail / Email address worldwide

export interface OtpRecord {
  target: string; // Email address
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

export interface SendResult {
  success: boolean;
  delivered: boolean;
  method: "smtp" | "resend" | "brevo";
  message: string;
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

  const record = store.get(normalized);
  if (!record) {
    return { success: false, error: "No pending verification code found. Please request a new code." };
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

  if (record.code === cleanCode) {
    record.verified = true;
    store.delete(normalized);
    return { success: true };
  }

  return { success: false, error: "Incorrect verification code. Please check your Gmail inbox and try again." };
}

export async function sendVerificationCode(
  target: string,
  code: string,
  roomId: string = "6"
): Promise<SendResult> {
  const cleanTarget = target.trim().toLowerCase();

  // 1. PRIMARY: GMAIL / SMTP via Nodemailer
  // Works for ALL email addresses worldwide without domain verification
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim() || gmailUser;
  const smtpPass = process.env.SMTP_PASS?.trim() || gmailAppPass;

  if ((gmailUser && gmailAppPass) || (smtpHost && smtpUser && smtpPass)) {
    try {
      // @ts-ignore
      const nodemailer = await import("nodemailer");
      const transportConfig: any = gmailUser
        ? {
            service: "gmail",
            auth: {
              user: gmailUser,
              pass: gmailAppPass,
            },
          }
        : {
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          };

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: `"AM Code" <${smtpUser}>`,
        to: cleanTarget,
        subject: `Your AM Code Verification: ${code}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 20px; background: #0f0f12; color: #f3f4f6; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f59e0b); color: #ffffff; font-weight: 900; font-size: 22px; padding: 10px 20px; border-radius: 12px; letter-spacing: 2px;">
                AM
              </div>
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 4px;">Verification Code</h2>
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">Multiplayer Code & Notes Workspace</p>
            </div>

            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 12px 0;">Your one-time 6-digit verification code is:</p>
              <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fb923c; background: #27272a; padding: 14px 20px; border-radius: 8px; display: inline-block;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #71717a; margin: 12px 0 0 0;">Valid for 10 minutes for room /${roomId || "6"}</p>
            </div>

            <p style="font-size: 12px; color: #71717a; text-align: center; line-height: 1.5; margin: 0;">
              If you did not request this verification code, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      console.log(`[OTP Service] Nodemailer sent OTP successfully to ${cleanTarget}`);
      return {
        success: true,
        delivered: true,
        method: "smtp",
        message: `Verification code sent to ${cleanTarget}! Check your inbox or spam folder.`,
      };
    } catch (smtpErr: any) {
      console.error("[OTP Service] Gmail SMTP error:", smtpErr.message);
    }
  }

  // 2. SECONDARY: RESEND API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim().length > 0) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `AM Code <${fromEmail}>`,
          to: cleanTarget,
          subject: `Your AM Code Verification: ${code}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 20px; background: #0f0f12; color: #f3f4f6; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #27272a;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f59e0b); color: #ffffff; font-weight: 900; font-size: 22px; padding: 10px 20px; border-radius: 12px; letter-spacing: 2px;">
                  AM
                </div>
                <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 4px;">Verification Code</h2>
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">Multiplayer Code & Notes Workspace</p>
              </div>

              <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 12px 0;">Your one-time 6-digit verification code is:</p>
                <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fb923c; background: #27272a; padding: 14px 20px; border-radius: 8px; display: inline-block;">
                  ${code}
                </div>
                <p style="font-size: 12px; color: #71717a; margin: 12px 0 0 0;">Valid for 10 minutes for room /${roomId || "6"}</p>
              </div>

              <p style="font-size: 12px; color: #71717a; text-align: center; line-height: 1.5; margin: 0;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
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

  return {
    success: false,
    delivered: false,
    method: "smtp",
    error: "Failed to send email verification code. Please make sure GMAIL_USER and GMAIL_APP_PASSWORD are configured in .env.local",
    message: "Email sending failed.",
  };
}
