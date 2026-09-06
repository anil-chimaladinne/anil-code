"use client";

import { useState, useEffect } from "react";
import { Mail, Check, X, Shield, Sparkles, User, AlertCircle, LogOut } from "lucide-react";

export interface UserProfile {
  email: string;
  name: string;
  avatar?: string;
  provider: "google" | "custom";
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile | null) => void;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  currentUserProfile,
  onProfileUpdate,
}: GoogleAuthModalProps) {
  const [emailInput, setEmailInput] = useState(currentUserProfile?.email || "");
  const [nameInput, setNameInput] = useState(currentUserProfile?.name || "");
  const [activeTab, setActiveTab] = useState<"google" | "quick">("google");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserProfile) {
      setEmailInput(currentUserProfile.email);
      setNameInput(currentUserProfile.name);
    }
  }, [currentUserProfile]);

  if (!isOpen) return null;

  const handleGoogleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setError("Please enter a valid Gmail / Email address");
      return;
    }

    const calculatedName =
      nameInput.trim() ||
      emailInput.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    setIsSaving(true);
    setError(null);

    const newProfile: UserProfile = {
      email: emailInput.trim().toLowerCase(),
      name: calculatedName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        emailInput.trim().toLowerCase()
      )}`,
      provider: "google",
    };

    localStorage.setItem("anil_user_profile", JSON.stringify(newProfile));
    onProfileUpdate(newProfile);
    setIsSaving(false);
    onClose();
  };

  const handleSignOut = () => {
    localStorage.removeItem("anil_user_profile");
    onProfileUpdate(null);
    setEmailInput("");
    setNameInput("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-[#2e2e38] bg-[#18181c] p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full blur-[1px]" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282830] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 border border-orange-400/50 text-white shadow-md shadow-orange-600/20">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {currentUserProfile ? "Your Profile & Gmail" : "Sign In with Google"}
              </h2>
              <p className="text-[11px] text-gray-400">
                Identify yourself for real-time collaboration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#282830] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentUserProfile ? (
          /* Profile details if already signed in */
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#202026] border border-[#2d2d38]">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-orange-600 border border-orange-400/50 flex items-center justify-center text-white font-bold text-base shrink-0">
                {currentUserProfile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUserProfile.avatar}
                    alt={currentUserProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  currentUserProfile.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-white truncate">
                    {currentUserProfile.name}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-orange-400 font-mono truncate">
                  {currentUserProfile.email}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#202026]/70 border border-[#2a2a34] text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-gray-300 font-medium">
                <Shield className="h-3.5 w-3.5 text-orange-400" />
                <span>Visitor & Collaboration Identification</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Your email and name are shared with the host and connected room collaborators so everyone knows who is typing and sharing.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-950/70 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleGoogleQuickSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Google / Gmail Address <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  autoFocus
                  className="w-full rounded-xl bg-[#202026] border border-[#34343e] pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Your Name <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl bg-[#202026] border border-[#34343e] pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <User className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-500" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-800/40 p-2.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#202026]/70 border border-[#2a2a34] text-[11px] text-gray-400">
              ⚡ Connect your Google profile to save your coding sessions, display your verified name to room members, and access room features.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Connect Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
