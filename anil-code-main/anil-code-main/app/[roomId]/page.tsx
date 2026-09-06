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

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  provider?: string;
}

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
  const [isMounted, setIsMounted] = useState(false);

  // User Name Tagging & Customization
  const [userName, setUserName] = useState<string>("User");
  const [isEditingName, setIsEditingName] = useState(false);
  const [inputName, setInputName] = useState("");
  const [autoTagLine, setAutoTagLine] = useState<boolean>(true);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [taggedToast, setTaggedToast] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const lastLocalVersion = useRef(0);
  const userId = useRef(`user_${Math.random().toString(36).substring(2, 9)}`);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize or load user name
  useEffect(() => {
    try {
      const savedName = localStorage.getItem("anil6_user_name");
      if (savedName && savedName.trim()) {
        setUserName(savedName.trim());
      } else {
        const randId = Math.floor(100 + Math.random() * 900);
        const defaultName = `User-${randId}`;
        setUserName(defaultName);
        localStorage.setItem("anil6_user_name", defaultName);
      }

      const savedAutoTag = localStorage.getItem("anil6_auto_tag");
      if (savedAutoTag !== null) {
        setAutoTagLine(savedAutoTag === "true");
      }
    } catch {} finally {
      setIsMounted(true);
    }
  }, []);

  const handleSaveName = () => {
    const clean = inputName.trim();
    if (clean) {
      setUserName(clean);
      localStorage.setItem("anil6_user_name", clean);
    }
    setIsEditingName(false);
  };

  const getCommentPrefix = (lang: string) => {
    switch (lang) {
      case "python":
      case "shell":
      case "bash":
        return "#";
      case "sql":
        return "--";
      case "html":
        return "<!--";
      case "plaintext":
      case "markdown":
        return "";
      default:
        return "//";
    }
  };

  const getNameTagPrefix = () => {
    const p = getCommentPrefix(language);
    if (!p) return `[${userName}]: `;
    if (p === "<!--") return `<!-- [${userName}]: --> `;
    return `${p} [${userName}]: `;
  };

  // Insert user name tag on current line
  const insertNameTag = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const tag = getNameTagPrefix();
    const position = editor.getPosition();
    const selection = editor.getSelection();

    if (position) {
      editor.executeEdits("name-tag", [
        {
          range: selection,
          text: tag,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
      setTaggedToast(true);
      setTimeout(() => setTaggedToast(false), 2000);
    }
  };

  // Send visitor tracking log
  const trackVisitor = useCallback(() => {
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
        name: userName,
      };

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }, [roomId, userName]);

  useEffect(() => {
    trackVisitor();
  }, [roomId, trackVisitor]);

  // Initialize Real-Time Sync (Ultra-fast 400ms polling + local BroadcastChannel)
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
            if (editorRef.current) {
              const cur = editorRef.current.getValue();
              if (cur !== event.data.code) {
                isRemoteUpdate.current = true;
                const pos = editorRef.current.getPosition();
                editorRef.current.setValue(event.data.code);
                if (pos) editorRef.current.setPosition(pos);
                setTimeout(() => {
                  isRemoteUpdate.current = false;
                }, 40);
              }
            } else {
              setCode(event.data.code);
            }
          }
          if (event.data?.type === "language-update") {
            setLanguage(event.data.language);
          }
        };
      } catch {}
    }

    // 2. Fetch initial room state
    fetch(`/api/sync/${roomId}?userId=${userId.current}&name=${encodeURIComponent(userName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== undefined && !code) {
          isRemoteUpdate.current = true;
          setCode(data.code);
          if (editorRef.current) {
            editorRef.current.setValue(data.code);
          }
          if (data.language) setLanguage(data.language);
          if (data.usersCount) setUsersCount(data.usersCount);
          if (data.activeUsers) setActiveUsers(data.activeUsers);
          lastLocalVersion.current = data.version || 1;
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 40);
        }
      })
      .catch(() => {});

    // 3. Fast Serverless Live Polling (400ms for seamless real-time typing across all users)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/sync/${roomId}?userId=${userId.current}&name=${encodeURIComponent(userName)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.usersCount) setUsersCount(data.usersCount);
          if (data.activeUsers) setActiveUsers(data.activeUsers);

          if (data.code !== undefined && data.version > lastLocalVersion.current) {
            lastLocalVersion.current = data.version;
            if (!isRemoteUpdate.current) {
              if (editorRef.current) {
                const cur = editorRef.current.getValue();
                if (cur !== data.code) {
                  isRemoteUpdate.current = true;
                  const pos = editorRef.current.getPosition();
                  editorRef.current.setValue(data.code);
                  if (pos) editorRef.current.setPosition(pos);
                  setCode(data.code);
                  setTimeout(() => {
                    isRemoteUpdate.current = false;
                  }, 40);
                }
              } else {
                setCode(data.code);
              }
              if (data.language) setLanguage(data.language);
            }
          }
        }
      } catch {}
    }, 400);

    return () => {
      clearInterval(pollInterval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [roomId, userName, code]);

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
          name: userName,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.version) lastLocalVersion.current = data.version;
        })
        .catch(() => {});
    },
    [roomId, language, userName]
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
        name: userName,
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

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add keyboard shortcut Alt+N or Cmd+N to insert user name tag
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyN, () => {
      insertNameTag();
    });
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

                {/* Users List with Gmail & Verified Name */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activeUsers.length > 0 ? (
                    activeUsers.map((u, idx) => {
                      const isSelf = u.userId === userId.current;
                      const displayName =
                        u.name || (isSelf ? "You (Active)" : `User ${idx + 1}`);
                      const displayEmail = u.email || null;
                      const displayAvatar = u.avatar || null;

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
                          {displayEmail && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono text-[11px] truncate">
                              <Mail className="h-3 w-3 text-orange-400 shrink-0" />
                              <span className="truncate">{displayEmail}</span>
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

        {/* Right: User Name, Tag Line, Language, Theme, Copy, Download, Clear, Share */}
        <div className="flex items-center gap-2">
          {/* User Name Badge & Quick Rename */}
          <div className="relative">
            {isEditingName ? (
              <div className="flex items-center gap-1 bg-[#25252b] border border-orange-500/80 rounded-md px-2 py-0.5 shadow-sm">
                <User className="h-3 w-3 text-orange-400" />
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Your Name"
                  autoFocus
                  maxLength={18}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="bg-transparent text-xs text-white outline-none w-20 font-medium placeholder-gray-500"
                />
                <button
                  onClick={handleSaveName}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold px-1"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setInputName(userName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border bg-orange-950/20 border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-950/40 text-orange-300 transition-all cursor-pointer select-none"
                title="Click to rename your typing name tag"
              >
                <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span className="font-semibold max-w-[90px] truncate">{userName}</span>
                <span className="text-[10px] text-orange-400/60 font-normal hidden sm:inline">✎</span>
              </button>
            )}
          </div>

          {/* Quick Insert Name Tag Button */}
          <button
            onClick={insertNameTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-orange-500/40 hover:bg-orange-600/30 text-orange-200 font-medium transition-colors cursor-pointer"
            title={`Insert '${getNameTagPrefix()}' at current line (Alt + N)`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="hidden md:inline">Tag Line as</span>
            <span className="font-semibold text-orange-300">{userName}</span>
            <span className="text-[10px] text-gray-500 hidden lg:inline font-mono">Alt+N</span>
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
