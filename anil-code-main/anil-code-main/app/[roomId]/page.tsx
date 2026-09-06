"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Editor, { OnMount } from "@monaco-editor/react";
import {
  Share2,
  Copy,
  Check,
  Download,
  Trash2,
  Moon,
  Sun,
  ChevronDown,
  Users,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  X,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GoogleAuthModal, UserProfile } from "@/components/auth/GoogleAuthModal";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";

const LANGUAGES = [
  { id: "plaintext", name: "Plain Text", ext: ".txt" },
  { id: "javascript", name: "JavaScript", ext: ".js" },
  { id: "typescript", name: "TypeScript", ext: ".ts" },
  { id: "python", name: "Python", ext: ".py" },
  { id: "html", name: "HTML", ext: ".html" },
  { id: "css", name: "CSS", ext: ".css" },
  { id: "cpp", name: "C++", ext: ".cpp" },
  { id: "java", name: "Java", ext: ".java" },
  { id: "json", name: "JSON", ext: ".json" },
  { id: "markdown", name: "Markdown", ext: ".md" },
  { id: "sql", name: "SQL", ext: ".sql" },
];

export default function NotepadRoomPage() {
  const params = useParams();
  const roomId = (params?.roomId as string) || "6";

  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("javascript");
  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [usersCount, setUsersCount] = useState<number>(1);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const lastLocalVersion = useRef(0);
  const userId = useRef(`user_${Math.random().toString(36).substring(2, 9)}`);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Load user profile from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anil_user_profile");
      if (saved) {
        setUserProfile(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Send visitor tracking log with profile
  const trackVisitor = useCallback(
    (profile?: UserProfile | null) => {
      try {
        const payload = {
          page: `/${roomId}`,
          referrer: typeof document !== "undefined" ? document.referrer : "",
          screenSize:
            typeof window !== "undefined"
              ? `${window.screen.width}x${window.screen.height}`
              : undefined,
          timezone:
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : undefined,
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
          email: profile?.email || userProfile?.email || undefined,
          name: profile?.name || userProfile?.name || undefined,
          avatar: profile?.avatar || userProfile?.avatar || undefined,
        };

        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
    },
    [roomId, userProfile]
  );

  useEffect(() => {
    trackVisitor(userProfile);
  }, [roomId, userProfile, trackVisitor]);

  // Handle profile update
  const handleProfileUpdate = (profile: UserProfile | null) => {
    setUserProfile(profile);
    trackVisitor(profile);

    // Sync profile immediately to room
    const p = profile
      ? `&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(
          profile.name
        )}&avatar=${encodeURIComponent(profile.avatar || "")}`
      : "";

    fetch(`/api/sync/${roomId}?userId=${userId.current}${p}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.activeUsers) setActiveUsers(data.activeUsers);
      })
      .catch(() => {});
  };

  // Initialize Serverless Real-Time Sync (0 WebSocket errors on Vercel)
  useEffect(() => {
    if (!roomId) return;

    // 1. Setup local BroadcastChannel for instant same-browser cross-tab sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(`anil6_room_${roomId}`);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (
            event.data?.type === "code-update" &&
            event.data.senderId !== userId.current
          ) {
            isRemoteUpdate.current = true;
            setCode(event.data.code);
            setTimeout(() => {
              isRemoteUpdate.current = false;
            }, 50);
          }
          if (event.data?.type === "language-update") {
            setLanguage(event.data.language);
          }
        };
      } catch {}
    }

    const profileParams = userProfile
      ? `&email=${encodeURIComponent(userProfile.email)}&name=${encodeURIComponent(
          userProfile.name
        )}&avatar=${encodeURIComponent(userProfile.avatar || "")}`
      : "";

    // 2. Fetch initial room state
    fetch(`/api/sync/${roomId}?userId=${userId.current}${profileParams}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== undefined && !code) {
          isRemoteUpdate.current = true;
          setCode(data.code);
          if (data.language) setLanguage(data.language);
          if (data.usersCount) setUsersCount(data.usersCount);
          if (data.activeUsers) setActiveUsers(data.activeUsers);
          lastLocalVersion.current = data.version || 1;
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 50);
        }
      })
      .catch(() => {});

    // 3. Ultra-fast Serverless Live Polling (for real-time sync across devices)
    const pollInterval = setInterval(async () => {
      try {
        const pParams = userProfile
          ? `&email=${encodeURIComponent(userProfile.email)}&name=${encodeURIComponent(
              userProfile.name
            )}&avatar=${encodeURIComponent(userProfile.avatar || "")}`
          : "";

        const res = await fetch(`/api/sync/${roomId}?userId=${userId.current}${pParams}`);
        if (res.ok) {
          const data = await res.json();
          if (data.usersCount) setUsersCount(data.usersCount);
          if (data.activeUsers) setActiveUsers(data.activeUsers);
          if (data.version > lastLocalVersion.current) {
            lastLocalVersion.current = data.version;
            if (!isRemoteUpdate.current) {
              isRemoteUpdate.current = true;
              setCode(data.code);
              setLanguage(data.language);
              setTimeout(() => {
                isRemoteUpdate.current = false;
              }, 50);
            }
          }
        }
      } catch {}
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [roomId, userProfile]);

  // Handle local typing
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      if (isRemoteUpdate.current) return;

      // Broadcast to local tabs instantly
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "code-update",
          code: newCode,
          senderId: userId.current,
        });
      }

      // Sync with Serverless API (for cross-device synchronization)
      fetch(`/api/sync/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          language,
          userId: userId.current,
          email: userProfile?.email,
          name: userProfile?.name,
          avatar: userProfile?.avatar,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.version) lastLocalVersion.current = data.version;
        })
        .catch(() => {});
    },
    [roomId, language, userProfile]
  );

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setIsLangOpen(false);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "language-update",
        language: newLang,
      });
    }

    fetch(`/api/sync/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        language: newLang,
        userId: userId.current,
        email: userProfile?.email,
        name: userProfile?.name,
        avatar: userProfile?.avatar,
      }),
    }).catch(() => {});
  };

  // Copy shareable link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download notepad code
  const handleDownload = () => {
    const currentLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomId}${currentLangObj.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear notepad
  const handleClear = () => {
    if (confirm("Clear all text in this notepad?")) {
      handleCodeChange("");
    }
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const currentLangName =
    LANGUAGES.find((l) => l.id === language)?.name || "JavaScript";

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden ${
        theme === "vs-dark" ? "bg-[#1e1e1e] text-gray-200" : "bg-white text-gray-800"
      }`}
    >
      {/* anil6 Top Navigation Bar */}
      <header
        className={`flex h-12 items-center justify-between px-4 select-none border-b shrink-0 z-30 ${
          theme === "vs-dark"
            ? "bg-[#1e1e1e] border-[#333333] text-gray-200"
            : "bg-[#f8f9fa] border-[#e0e0e0] text-gray-800"
        }`}
      >
        {/* Left: AM Logo and Anil6 Brand Name (Crisp & Blur-Free) */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5 group font-bold tracking-tight">
            {/* Crisp Blur-Free AM Logo Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 border border-orange-400/60 text-white font-black text-sm tracking-wider select-none shadow-sm transition-transform duration-150 group-hover:scale-105">
              AM
            </div>
            <span className="font-bold tracking-tight text-base text-white">
              Anil<span className="text-orange-500 font-extrabold">6</span>
            </span>
          </a>

          <div
            className={`h-4 w-px ${
              theme === "vs-dark" ? "bg-gray-700" : "bg-gray-300"
            }`}
          />

          {/* Live Online Badge & Interactive User Details Popover */}
          <div className="relative">
            <button
              onClick={() => setIsUsersModalOpen(!isUsersModalOpen)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-all cursor-pointer select-none ${
                theme === "vs-dark"
                  ? "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36] text-gray-200"
                  : "bg-white border-gray-300 hover:bg-gray-50 text-gray-800"
              }`}
              title="Click to view live user information"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-medium hidden sm:inline">
                {usersCount} {usersCount === 1 ? "user" : "users"} online
              </span>
              <span className="text-[11px] font-medium sm:hidden">
                {usersCount} online
              </span>
              <ChevronDown
                className={`h-3 w-3 opacity-60 transition-transform duration-150 ${
                  isUsersModalOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* User Details Dropdown Popover */}
            {isUsersModalOpen && (
              <div
                className={`absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-xl border p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  theme === "vs-dark"
                    ? "bg-[#18181c] border-[#2e2e38] text-gray-200"
                    : "bg-white border-gray-200 text-gray-800 shadow-xl"
                }`}
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2e2e38] mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-400" />
                    <span className="font-bold text-xs text-white">
                      Active Users in /{roomId} ({activeUsers.length || usersCount})
                    </span>
                  </div>
                  <button
                    onClick={() => setIsUsersModalOpen(false)}
                    className="p-1 rounded-md hover:bg-[#282830] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Sign-in prompt if not yet logged in */}
                {!userProfile && (
                  <div className="mb-3 p-2.5 rounded-lg bg-orange-950/30 border border-orange-500/30 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-orange-200">
                      <span className="font-semibold text-white">Identify yourself:</span> Connect Gmail to display your name & avatar.
                    </div>
                    <button
                      onClick={() => {
                        setIsUsersModalOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {/* Users List with Gmail & Verified Name */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activeUsers.length > 0 ? (
                    activeUsers.map((u, idx) => {
                      const isSelf = u.userId === userId.current;
                      const hasEmail = Boolean(u.email || (isSelf && userProfile?.email));
                      const displayName =
                        u.name || (isSelf && userProfile?.name) || (isSelf ? "You (Active)" : `Guest User ${idx + 1}`);
                      const displayEmail = u.email || (isSelf && userProfile?.email) || null;
                      const displayAvatar = u.avatar || (isSelf && userProfile?.avatar) || null;

                      return (
                        <div
                          key={u.userId || idx}
                          className="rounded-lg bg-[#202026] border border-[#2a2a34] p-2.5 text-xs space-y-1.5"
                        >
                          {/* User Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-orange-600 border border-orange-400/50 flex items-center justify-center text-white font-bold text-[10px] overflow-hidden shrink-0">
                                {displayAvatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={displayAvatar}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white truncate max-w-[140px]">
                                    {displayName}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] text-orange-400 font-normal">
                                      (You)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] text-gray-400 font-mono shrink-0">
                              {u.device === "Mobile"
                                ? "📱 Mobile"
                                : u.device === "Tablet"
                                ? "📱 Tablet"
                                : "🖥️ Desktop"}
                            </span>
                          </div>

                          {/* Gmail Badge */}
                          {displayEmail ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono text-[11px] truncate">
                              <Mail className="h-3 w-3 text-orange-400 shrink-0" />
                              <span className="truncate">{displayEmail}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-gray-500 text-[10px]">
                              <User className="h-3 w-3 shrink-0" />
                              <span>Guest (No Gmail attached)</span>
                            </div>
                          )}

                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                            <MapPin className="h-3 w-3 text-orange-400 shrink-0" />
                            <span>
                              {u.city && u.city !== "Unknown" ? `${u.city}, ` : ""}
                              {u.country || "Location detected"}
                            </span>
                            {u.region && u.region !== "Unknown" && (
                              <span className="text-[10px] text-gray-500">
                                ({u.region})
                              </span>
                            )}
                          </div>

                          {/* IP & System */}
                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-[#2a2a34]">
                            <span className="font-mono text-gray-300">
                              IP: {u.ip}
                            </span>
                            <span>
                              {u.os} • {u.browser}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg bg-[#202026] border border-[#2a2a34] p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-white">You (Active)</span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Connected to room /{roomId}
                      </p>
                    </div>
                  )}
                </div>

                {/* Popover Footer with Admin Link */}
                <div className="mt-3 pt-3 border-t border-[#2e2e38] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400">
                    Real-time session
                  </span>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold text-[11px] transition-colors"
                  >
                    <span>Full Visitor Admin</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: User Profile Button, Language, Theme, Copy, Download, Clear, Share */}
        <div className="flex items-center gap-2">
          {/* Google Sign-in / User Profile Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all cursor-pointer ${
              userProfile
                ? "bg-orange-950/30 border-orange-500/40 hover:bg-orange-900/40 text-orange-200"
                : "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36] text-gray-300"
            }`}
            title={userProfile ? userProfile.email : "Sign in with Google"}
          >
            {userProfile ? (
              <>
                <div className="h-4 w-4 rounded-full bg-orange-600 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
                  {userProfile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userProfile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium max-w-[80px] sm:max-w-[120px] truncate hidden xs:inline">
                  {userProfile.name}
                </span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden sm:inline font-medium">Google Sign-In</span>
                <span className="sm:hidden font-medium">Sign-In</span>
              </>
            )}
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                theme === "vs-dark"
                  ? "bg-[#2d2d2d] border-[#3e3e42] hover:bg-[#383838] text-gray-200"
                  : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span>{currentLangName}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isLangOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLangOpen(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-1 z-50 w-40 rounded shadow-xl border py-1 max-h-64 overflow-y-auto text-xs ${
                    theme === "vs-dark"
                      ? "bg-[#252526] border-[#333333] text-gray-200"
                      : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={`w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors ${
                        language === lang.id ? "font-bold text-blue-500" : ""
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "vs-dark" ? "vs-light" : "vs-dark")}
            className={`p-1.5 rounded text-xs border transition-colors ${
              theme === "vs-dark"
                ? "bg-[#2d2d2d] border-[#3e3e42] hover:bg-[#383838]"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
            title="Toggle theme"
          >
            {theme === "vs-dark" ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-gray-600" />
            )}
          </button>

          {/* Copy Code Button */}
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
              theme === "vs-dark"
                ? "bg-[#2d2d2d] border-[#3e3e42] hover:bg-[#383838]"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
            title="Copy text"
          >
            {copiedCode ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 opacity-70" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
              theme === "vs-dark"
                ? "bg-[#2d2d2d] border-[#3e3e42] hover:bg-[#383838]"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
            title="Download notepad"
          >
            <Download className="h-3 w-3 opacity-70" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className={`p-1.5 rounded text-xs border transition-colors ${
              theme === "vs-dark"
                ? "bg-[#2d2d2d] border-[#3e3e42] hover:bg-red-950/40 hover:border-red-500/40 text-gray-400 hover:text-red-400"
                : "bg-white border-gray-300 hover:bg-red-50 text-gray-600 hover:text-red-600"
            }`}
            title="Clear notepad"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Share Button (Primary) */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold px-3 py-1 rounded text-xs shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUserProfile={userProfile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Automatic Google One-Tap Popup on Page Load */}
      <GoogleOneTap
        currentUserProfile={userProfile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Fullscreen Instant Real-Time Notepad with Full Photo Background */}
      <main className="flex-1 w-full h-full relative overflow-hidden watermark-notepad">
        {/* Full Notepad Photo Background */}
        <div
          className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/avengers-bg.jpg')",
          }}
          aria-hidden="true"
        >
          {/* Subtle Dark Overlay for Code Contrast & Readability */}
          <div
            className={`w-full h-full ${
              theme === "vs-dark"
                ? "bg-black/60 backdrop-blur-[0.5px]"
                : "bg-white/70 backdrop-blur-[0.5px]"
            }`}
          />
        </div>

        <div className="relative z-10 w-full h-full">
          <Editor
            height="100%"
            width="100%"
            language={language}
            value={code}
            theme={theme}
            onMount={handleEditorMount}
            onChange={(val) => handleCodeChange(val || "")}
            options={{
              fontSize: 15,
              lineNumbers: "on",
              wordWrap: "on",
              automaticLayout: true,
              fontFamily:
                "'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              bracketPairColorization: { enabled: true },
              renderLineHighlight: "all",
            }}
            loading={
              <div className="flex h-full w-full items-center justify-center text-sm font-mono text-gray-400">
                Loading notepad...
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
