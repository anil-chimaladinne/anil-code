"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Phone,
  Sparkles,
} from "lucide-react";
import { UserProfile } from "./GoogleAuthModal";

interface MandatoryAuthGateProps {
  roomId: string;
  onAuthenticate: (profile: UserProfile) => void;
}

export function MandatoryAuthGate({ roomId, onAuthenticate }: MandatoryAuthGateProps) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "verify">("input");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    delivered: boolean;
    method: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Request 6-digit OTP
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = target.trim();

    if (!cleanTarget || cleanTarget.length < 3) {
      setError("Please enter a valid Gmail address or mobile number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: cleanTarget, roomId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep("verify");
        setPreviewCode(data.previewCode || null);
        setDeliveryInfo({
          delivered: Boolean(data.delivered),
          method: data.method || "demo_preview",
          message: data.message || "",
        });
        setResendCooldown(30);
      } else {
        setError(data.error || "Failed to send verification code. Try again.");
      }
    } catch {
      setError("Network error. Could not connect to verification server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          code: cleanCode,
          name: name.trim() || undefined,
          roomId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        localStorage.setItem("anil_user_profile", JSON.stringify(data.profile));
        onAuthenticate(data.profile);
      } else {
        setError(data.error || "Invalid verification code. Please check and try again.");
      }
    } catch {
      setError("Network error. Could not verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121214] text-gray-200 selection:bg-orange-500/30">
      {/* Full Photo Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-25 filter blur-[2px]"
        style={{ backgroundImage: "url('/avengers-bg.jpg')" }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2e2e38] bg-[#18181c]/95 p-7 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Top Orange Gradient Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full blur-[1px]" />

        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 border border-orange-400/50 text-white font-black text-xl tracking-wider mb-4 shadow-xl shadow-orange-600/25">
            AM
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Anil<span className="text-orange-500">6</span> Verification
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {step === "input" ? (
              <>
                Gmail / Mobile verification is{" "}
                <strong className="text-orange-400 font-semibold">compulsory</strong> to unlock room{" "}
                <span className="font-mono text-white font-bold">/{roomId}</span>
              </>
            ) : (
              <>
                Enter the 6-digit code sent to{" "}
                <span className="font-mono text-orange-400 font-bold">{target}</span>
              </>
            )}
          </p>
        </div>

        {step === "input" ? (
          /* STEP 1: Enter Gmail or Mobile Number */
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Gmail Address or Mobile Number <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. yourname@gmail.com or 9876543210"
                  required
                  autoFocus
                  className="w-full rounded-xl bg-[#222228] border border-[#34343e] pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono"
                />
                <div className="absolute left-3.5 top-3.5 text-gray-500">
                  {target.includes("@") ? (
                    <Mail className="h-4 w-4 text-orange-400" />
                  ) : target.match(/\d/) ? (
                    <Phone className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Mail className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Your Display Name <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anil Kumar"
                  className="w-full rounded-xl bg-[#222228] border border-[#34343e] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <User className="absolute left-3.5 top-3 h-3.5 w-3.5 text-gray-500" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800/50 p-2.5 text-xs text-red-300 text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !target.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 text-sm shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoBack}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#222228] hover:bg-[#2c2c34] border border-[#34343e] text-gray-400 hover:text-white py-2.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel & Go to Back Page</span>
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Enter 6-digit Verification Code */
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {/* Status indicator */}
            {deliveryInfo?.delivered ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center space-y-1">
                <div className="text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Verification Code Dispatched!</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Please check your inbox (and spam/promotions folder) for{" "}
                  <span className="font-mono text-white font-semibold">{target}</span>.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Testing / Demo OTP
                  </span>
                  {previewCode && (
                    <button
                      type="button"
                      onClick={() => setCode(previewCode)}
                      className="text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/40 transition-colors cursor-pointer"
                    >
                      ⚡ Auto-fill Code
                    </button>
                  )}
                </div>
                {previewCode && (
                  <div className="flex items-center justify-between bg-[#131316] p-2 rounded-lg border border-amber-500/20">
                    <span className="text-xs text-gray-400">Your Code:</span>
                    <span className="font-mono font-black text-base text-amber-400 tracking-widest">
                      {previewCode}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 leading-tight">
                  {deliveryInfo?.message || (
                    <>
                      ℹ️ To send real emails to your Gmail inbox, add <code className="text-amber-300 font-mono">GMAIL_USER</code> and <code className="text-amber-300 font-mono">GMAIL_APP_PASSWORD</code> (or <code className="text-amber-300 font-mono">RESEND_API_KEY</code>) to <code className="text-gray-300 font-mono">.env.local</code>.
                    </>
                  )}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 text-center">
                Enter 6-Digit Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    if (error) setError(null);
                  }}
                  placeholder="• • • • • •"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.6em] font-mono text-xl font-bold rounded-xl bg-[#222228] border border-[#34343e] py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800/50 p-2.5 text-xs text-red-300 text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 text-sm shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify & Open Notepad</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setCode("");
                    setError(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Change Gmail/Phone</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleSendCode}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoBack}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#222228] hover:bg-[#2c2c34] border border-[#34343e] text-gray-400 hover:text-white py-2.5 text-xs font-semibold transition-colors cursor-pointer mt-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel & Go to Back Page</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#26262e] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Verified session enables real-time collaboration</span>
        </div>
      </div>
    </div>
  );
}
