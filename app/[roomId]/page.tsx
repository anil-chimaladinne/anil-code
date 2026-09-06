"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const editorRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const lastLocalVersion = useRef(0);
  const userId = useRef(`user_${Math.random().toString(36).substring(2, 9)}`);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

    // 2. Fetch initial room state
    fetch(`/api/sync/${roomId}?userId=${userId.current}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== undefined && !code) {
          isRemoteUpdate.current = true;
          setCode(data.code);
          if (data.language) setLanguage(data.language);
          if (data.usersCount) setUsersCount(data.usersCount);
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
        const res = await fetch(`/api/sync/${roomId}?userId=${userId.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.usersCount) setUsersCount(data.usersCount);
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
  }, [roomId]);

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
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.version) lastLocalVersion.current = data.version;
        })
        .catch(() => {});
    },
    [roomId, language]
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
            ? "bg-[#252526]/90 backdrop-blur-md border-[#333333] text-gray-200"
            : "bg-[#f3f3f3]/90 backdrop-blur-md border-[#e0e0e0] text-gray-800"
        }`}
      >
        {/* Left: AM Logo and Brand Name */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5 group font-bold tracking-tight text-sm">
            {/* AM Logo Avatar */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/30 group-hover:scale-105 transition-all duration-200 border border-amber-400/40 text-white font-black text-xs tracking-wider select-none">
              AM
            </div>
            <span className="font-bold tracking-tight text-base">
              AM
            </span>
          </a>

          <div
            className={`h-4 w-px ${
              theme === "vs-dark" ? "bg-gray-700" : "bg-gray-300"
            }`}
          />

          <span className="text-xs font-mono opacity-80">/{roomId}</span>

          {/* Live Online Badge */}
          <div className="flex items-center gap-1.5 ml-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] opacity-75 hidden sm:inline">
              {usersCount} {usersCount === 1 ? "user" : "users"} online
            </span>
          </div>
        </div>

        {/* Right: Actions (Language, Theme, Copy, Download, Clear, Share) */}
        <div className="flex items-center gap-2">
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
