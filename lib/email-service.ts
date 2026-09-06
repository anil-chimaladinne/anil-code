/**
 * Email & SMS Dispatch Service for Anil6 Verification Codes
 * Supports:
 * - Resend API (RESEND_API_KEY)
 * - Brevo / Sendinblue (BREVO_API_KEY)
 * - Gmail / Custom SMTP (GMAIL_USER + GMAIL_APP_PASSWORD or SMTP_HOST/USER/PASS)
 * - Twilio SMS for phone numbers (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER)
 * - Built-in instant preview fallback for dev/demo mode so user is never blocked
 */

export interface SendResult {
  success: boolean;
  delivered: boolean;
  method: "resend" | "brevo" | "smtp" | "twilio" | "demo_preview";
  message: string;
  previewCode?: string;
  error?: string;
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
    // 1A. RESEND API
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
            html: buildEmailTemplate(code, roomId),
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.id) {
          console.log(`[EmailService] Resend email dispatched successfully to ${cleanTarget} (ID: ${resData.id})`);
          return {
            success: true,
            delivered: true,
            method: "resend",
            message: `Verification code sent to ${cleanTarget} via email! Check your inbox or spam folder.`,
          };
        } else {
          console.warn("[EmailService] Resend returned non-200 response:", resData);
          const detail = resData.message || resData.error || "Email delivery failed via Resend";
          return {
            success: true,
            delivered: false,
            method: "resend",
            previewCode: code,
            error: detail,
            message: `Resend Notice: ${detail}. Use the verification code below.`,
          };
        }
      } catch (err: any) {
        console.error("[EmailService] Resend dispatch network error:", err.message);
      }
    }

    // 1B. BREVO (Sendinblue) API
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      try {
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "auth@anil-code.com";
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Anil6 Security", email: senderEmail },
            to: [{ email: cleanTarget }],
            subject: `Your Anil6 Verification Code: ${code}`,
            htmlContent: buildEmailTemplate(code, roomId),
          }),
        });

        const resData = await res.json();
        if (res.ok && (resData.messageId || resData.id)) {
          return {
            success: true,
            delivered: true,
            method: "brevo",
            message: `Verification code sent to ${cleanTarget} via Brevo!`,
          };
        } else {
          console.warn("Brevo API warning/failure:", resData);
        }
      } catch (err: any) {
        console.error("Brevo dispatch error:", err.message);
      }
    }

    // 1C. GMAIL / SMTP via Nodemailer (if configured)
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPass = process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER || gmailUser;
    const smtpPass = process.env.SMTP_PASS || gmailAppPass;

    if ((gmailUser && gmailAppPass) || (smtpHost && smtpUser && smtpPass)) {
      try {
        // Dynamic import / require of nodemailer
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
          from: `"Anil6 Security" <${smtpUser}>`,
          to: cleanTarget,
          subject: `Your Anil6 Verification Code: ${code}`,
          html: buildEmailTemplate(code, roomId),
        });

        return {
          success: true,
          delivered: true,
          method: "smtp",
          message: `Verification code sent to ${cleanTarget} via Gmail/SMTP!`,
        };
      } catch (smtpErr: any) {
        console.error("SMTP dispatch error:", smtpErr.message);
      }
    }
  }

  // ==========================================
  // 2. MOBILE SMS DELIVERY FLOW
  // ==========================================
  if (!isEmail) {
    // 2A. FAST2SMS (Instant SMS for Indian 10-digit mobile numbers)
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
          console.log(`[EmailService] Fast2SMS dispatched successfully to ${mobile10}`);
          return {
            success: true,
            delivered: true,
            method: "fast2sms" as any,
            message: `SMS verification code dispatched to ${cleanTarget}!`,
          };
        } else {
          console.warn("[EmailService] Fast2SMS response:", resData);
          const detail = resData.message || (Array.isArray(resData.message) ? resData.message[0] : "SMS failed");
          return {
            success: true,
            delivered: false,
            method: "demo_preview",
            previewCode: code,
            message: `Fast2SMS notice: ${detail}. Use the verification code below.`,
          };
        }
      } catch (smsErr: any) {
        console.error("[EmailService] Fast2SMS error:", smsErr.message);
      }
    }

    // 2B. TWILIO SMS (Global phone numbers)
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
            message: `SMS verification code dispatched to ${cleanTarget}!`,
          };
        }
      } catch (smsErr: any) {
        console.error("[EmailService] Twilio SMS dispatch error:", smsErr.message);
      }
    }
  }

  // ==========================================
  // 3. DEMO / DEV INSTANT FALLBACK MODE
  // ==========================================
  // If real email or SMS service credentials are not yet configured in .env.local,
  // return the preview code so user can test and use the application immediately!
  return {
    success: true,
    delivered: false,
    method: "demo_preview",
    previewCode: code,
    message: isEmail
      ? `No SMTP or Resend credentials configured yet in .env.local. Use the preview code below.`
      : `No SMS gateway (Twilio) configured yet in .env.local. Use the preview code below.`,
  };
}

function buildEmailTemplate(code: string, roomId: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 20px; background: #0f0f12; color: #f3f4f6; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #27272a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f59e0b); color: #ffffff; font-weight: 900; font-size: 22px; padding: 10px 20px; border-radius: 12px; letter-spacing: 2px;">
          AM
        </div>
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 4px;">Anil6 Room Verification</h2>
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
  `;
}
