// Global In-Memory OTP Store

export interface OtpRecord {
  target: string; // Email or Mobile Number
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
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
