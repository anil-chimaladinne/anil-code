"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Check, X, Shield, Sparkles, ArrowRight } from "lucide-react";
import { UserProfile } from "./GoogleAuthModal";

interface GoogleOneTapProps {
  onProfileUpdate: (profile: UserProfile) => void;
  currentUserProfile: UserProfile | null;
}

// Function to decode JWT tokens from Google GIS
function decodeGoogleJwt(token: string): { email?: string; name?: string; picture?: string } {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export function GoogleOneTap({ onProfileUpdate, currentUserProfile }: GoogleOneTapProps) {
  const [showOneTapWidget, setShowOneTapWidget] = useState(false);
  const [inputEmail, setInputEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleSuccessfulAuth = useCallback(
    (profile: UserProfile) => {
      localStorage.setItem("anil_user_profile", JSON.stringify(profile));
      onProfileUpdate(profile);
      setShowOneTapWidget(false);
    },
    [onProfileUpdate]
  );

  useEffect(() => {
    // If user already signed in, do not show One Tap
    if (currentUserProfile || isDismissed) {
      setShowOneTapWidget(false);
      return;
    }

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "102938475610-example.apps.googleusercontent.com";

    // 1. Try Native Google Identity Services One Tap
    const initGis = () => {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (response?.credential) {
                const decoded = decodeGoogleJwt(response.credential);
                if (decoded.email) {
                  const profile: UserProfile = {
                    email: decoded.email.toLowerCase(),
                    name: decoded.name || decoded.email.split("@")[0],
                    avatar:
                      decoded.picture ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        decoded.email.toLowerCase()
                      )}`,
                    provider: "google",
                  };
                  handleSuccessfulAuth(profile);
                }
              }
            },
            auto_select: true,
            cancel_on_tap_outside: false,
          });

          (window as any).google.accounts.id.prompt((notification: any) => {
            if (
              notification.isNotDisplayed() ||
              notification.isSkippedMoment() ||
              notification.isDismissedMoment()
            ) {
              // Fallback to floating One-Tap prompt widget
              setShowOneTapWidget(true);
            }
          });
        } catch {
          setShowOneTapWidget(true);
        }
      } else {
        setShowOneTapWidget(true);
      }
    };

    // Load GIS script if not present
    if (!document.getElementById("google-gis-script")) {
      const script = document.createElement("script");
      script.id = "google-gis-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(initGis, 500);
      };
      script.onerror = () => {
        setShowOneTapWidget(true);
      };
      document.head.appendChild(script);
    } else {
      const timer = setTimeout(initGis, 1000);
      return () => clearTimeout(timer);
    }

    // Auto-display One Tap card after 1.5s delay if not already shown
    const fallbackTimer = setTimeout(() => {
      if (!currentUserProfile) {
        setShowOneTapWidget(true);
      }
    }, 1500);

    return () => clearTimeout(fallbackTimer);
  }, [currentUserProfile, isDismissed, handleSuccessfulAuth]);

  const handleQuickOneTap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim() || !inputEmail.includes("@")) return;

    setIsSubmitting(true);
    const email = inputEmail.trim().toLowerCase();
    const name = email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const profile: UserProfile = {
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      provider: "google",
    };

    handleSuccessfulAuth(profile);
    setIsSubmitting(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowOneTapWidget(false);
  };

  if (currentUserProfile || !showOneTapWidget || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-14 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-[#333340] bg-[#18181c] p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 text-gray-200">
      {/* Header with Google Colors Accent */}
      <div className="flex items-center justify-between pb-3 border-b border-[#282832] mb-3">
        <div className="flex items-center gap-2">
          {/* Google Logo SVG */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1 shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">
              Sign in with Google
            </h4>
            <p className="text-[10px] text-gray-400">Continue to Anil6 Notepad</p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-[#282832] text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto One-Tap Form */}
      <form onSubmit={handleQuickOneTap} className="space-y-3">
        <p className="text-[11px] text-gray-300">
          Connect your Google / Gmail account with 1-click to collaborate and save code:
        </p>

        <div className="relative">
          <input
            type="email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            placeholder="Enter your Gmail / Google Account"
            required
            className="w-full rounded-xl bg-[#222228] border border-[#34343e] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
          />
          <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          >
            Not now
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !inputEmail.includes("@")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <span>Continue as User</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
