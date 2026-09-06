"use client";

import { useState } from "react";
import { Mail, User, ArrowRight, ShieldCheck, Sparkles, Code2 } from "lucide-react";
import { UserProfile } from "./GoogleAuthModal";

interface MandatoryAuthGateProps {
  roomId: string;
  onAuthenticate: (profile: UserProfile) => void;
}

export function MandatoryAuthGate({ roomId, onAuthenticate }: MandatoryAuthGateProps) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();

    if (!trimmed) {
      setError("Please enter your Name or Gmail address to continue");
      return;
    }

    setIsLoading(true);
    setError(null);

    const isEmail = trimmed.includes("@");
    const email = isEmail ? trimmed.toLowerCase() : `${trimmed.replace(/\s+/g, "").toLowerCase()}@visitor.anil6`;
    const name = isEmail
      ? trimmed.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : trimmed;

    const profile: UserProfile = {
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmed.toLowerCase())}`,
      provider: isEmail ? "google" : "custom",
    };

    localStorage.setItem("anil_user_profile", JSON.stringify(profile));
    onAuthenticate(profile);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121214] text-gray-200 selection:bg-orange-500/30">
      {/* Full Photo Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-25 filter blur-[2px]"
        style={{ backgroundImage: "url('/avengers-bg.jpg')" }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2e2e38] bg-[#18181c]/95 p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Top Orange Gradient Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full blur-[1px]" />

        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 border border-orange-400/50 text-white font-black text-xl tracking-wider mb-4 shadow-xl shadow-orange-600/25">
            AM
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Welcome to Anil<span className="text-orange-500">6</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Please enter your <strong className="text-gray-200">Name</strong> or <strong className="text-gray-200">Gmail</strong> to access room <span className="font-mono text-orange-400 font-bold">/{roomId}</span>
          </p>
        </div>

        {/* Mandatory Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Your Name or Gmail Address <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Anil Kumar or anil@gmail.com"
                required
                autoFocus
                className="w-full rounded-xl bg-[#222228] border border-[#34343e] pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <div className="absolute left-3.5 top-3.5 text-gray-500">
                {identifier.includes("@") ? (
                  <Mail className="h-4 w-4 text-orange-400" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 p-2.5 text-xs text-red-300 text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !identifier.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 text-sm shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
          >
            {isLoading ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Enter Notepad</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#26262e] flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Your identity connects you to live room collaboration</span>
        </div>
      </div>
    </div>
  );
}
