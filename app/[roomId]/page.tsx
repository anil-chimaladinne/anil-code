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
  ExternalLink,
  X,
  User,
  Play,
  Terminal,
  RotateCcw,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileCode,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageById } from "@/lib/languages";
import { executeCode, ExecutionResult } from "@/lib/execution";

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  provider?: string;
}

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

  // Compilation & Output Panel state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isOutputOpen, setIsOutputOpen] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<"output" | "preview">("output");
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(true);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState<boolean>(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [taggedToast, setTaggedToast] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const lastLocalVersion = useRef(0);
  const userId = useRef(`user_${Math.random().toString(36).substring(2, 9)}`);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const syncTimeoutRef = useRef<any>(null);

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
    const selection = editor.getSelection();

    if (selection) {
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

  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Smoothly apply incoming remote changes without resetting cursor or undo stack
  const applyRemoteCode = useCallback((newCode: string) => {
    if (newCode === undefined || newCode === null) return;
    if (codeRef.current === newCode) return;
    codeRef.current = newCode;
    setCode(newCode);

    if (editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        const cur = model.getValue();
        if (cur !== newCode) {
          isRemoteUpdate.current = true;
          const fullRange = model.getFullModelRange();
          editor.executeEdits("remote-sync", [
            {
              range: fullRange,
              text: newCode,
              forceMoveMarkers: true,
            },
          ]);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 30);
        }
      }
    }
  }, []);

  const userNameRef = useRef(userName);
  const languageRef = useRef(language);
  const autoTagLineRef = useRef(autoTagLine);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    autoTagLineRef.current = autoTagLine;
  }, [autoTagLine]);

  // Initialize Real-Time Sync (Socket.IO WebSockets + SSE Stream + BroadcastChannel)
  useEffect(() => {
    if (!roomId) return;

    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    // 1. Setup True WebSockets via Socket.IO
    import("socket.io-client")
      .then(({ io }) => {
        if (!isSubscribed) return;
        try {
          const socket = io({
            transports: ["websocket", "polling"],
            reconnectionAttempts: 10,
            timeout: 5000,
          });
          socketRef.current = socket;

          socket.emit("join-room", {
            roomId,
            user: { id: userId.current, name: userNameRef.current },
          });

          socket.on("code-update", (data) => {
            if (data?.code !== undefined && data.senderSocketId !== socket.id) {
              applyRemoteCode(data.code);
            }
          });

          socket.on("language-update", (data) => {
            if (data?.language) setLanguage(data.language);
          });
        } catch {}
      })
      .catch(() => {});

    // 2. Setup local BroadcastChannel for instant same-machine cross-tab sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(`anil6_room_${roomId}`);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (
            event.data?.type === "code-update" &&
            event.data.senderId !== userId.current
          ) {
            applyRemoteCode(event.data.code);
          }
          if (event.data?.type === "language-update") {
            setLanguage(event.data.language);
          }
        };
      } catch {}
    }

    // 3. Setup Server-Sent Events (SSE) for instant synchronization
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        const streamUrl = `/api/sync/${roomId}/stream?userId=${userId.current}&name=${encodeURIComponent(userName)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (e) => {
          try {
            if (!e.data || e.data.startsWith(":")) return;
            const data = JSON.parse(e.data);

            if (data.usersCount) setUsersCount(data.usersCount);
            if (data.activeUsers) setActiveUsers(data.activeUsers);

            if (data.code !== undefined && data.senderId !== userId.current) {
              applyRemoteCode(data.code);
              if (data.language) setLanguage(data.language);
            }
          } catch {}
        };
      } catch {}
    }

    // 4. Initial fetch & background resilience poll
    fetch(`/api/sync/${roomId}?userId=${userId.current}&name=${encodeURIComponent(userName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== undefined && !codeRef.current) {
          applyRemoteCode(data.code);
          if (data.language) setLanguage(data.language);
          if (data.usersCount) setUsersCount(data.usersCount);
          if (data.activeUsers) setActiveUsers(data.activeUsers);
          lastLocalVersion.current = data.version || 1;
        }
      })
      .catch(() => {});

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
              applyRemoteCode(data.code);
              if (data.language) setLanguage(data.language);
            }
          }
        }
      } catch {}
    }, 400);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (eventSource) {
        eventSource.close();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [roomId, userName, applyRemoteCode]);

  // Handle local typing with instant Socket.IO + Broadcast + debounced HTTP dispatch
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      if (isRemoteUpdate.current) return;

      if (socketRef.current) {
        socketRef.current.emit("code-change", {
          roomId,
          code: newCode,
        });
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "code-update",
          code: newCode,
          senderId: userId.current,
        });
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
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
      }, 100);
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

  // Reset to language template
  const handleResetTemplate = () => {
    const langObj = getLanguageById(language);
    if (langObj.defaultCode) {
      if (confirm(`Reset code to standard ${langObj.name} template?`)) {
        handleCodeChange(langObj.defaultCode);
      }
    }
  };

  // Compile and Execute Code
  const handleRunCode = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsOutputOpen(true);

    if (language === "html") {
      setActiveOutputTab("preview");
    } else {
      setActiveOutputTab("output");
    }

    try {
      const res = await executeCode(language, code, customInput);
      setExecutionResult(res);
    } catch (err: any) {
      setExecutionResult({
        stdout: "",
        stderr: `Compilation / Execution error: ${err.message || "Unknown error"}`,
        exitCode: 1,
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, language, code, customInput]);

  // Copy & Share room link
  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    setShareUrl(url);

    let copied = false;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopiedLink(true);
        })
        .catch(() => {
          fallbackCopyText(url);
        });
      copied = true;
    }

    if (!copied) {
      fallbackCopyText(url);
    }

    setIsShareModalOpen(true);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
    } catch {}
  };

  // Copy code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy output terminal contents
  const handleCopyOutput = () => {
    if (!executionResult) return;
    const text = executionResult.stdout || executionResult.stderr;
    navigator.clipboard.writeText(text);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Download notepad code
  const handleDownload = () => {
    const currentLangObj = getLanguageById(language);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomId}${currentLangObj.extension}`;
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

    editor.updateOptions({
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "smooth",
      wordWrap: "on",
      tabSize: 2,
    });

    // Register keyboard shortcuts to Compile & Run:
    // 1. Ctrl+Enter / Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode();
    });

    // 2. F9 (Dev-C++ / Code::Blocks / popular IDE shortcut)
    editor.addCommand(monaco.KeyCode.F9, () => {
      handleRunCode();
    });

    // 3. F11 (Compile & Run)
    editor.addCommand(monaco.KeyCode.F11, () => {
      handleRunCode();
    });

    // 4. F5 (VS Code / Visual Studio)
    editor.addCommand(monaco.KeyCode.F5, () => {
      handleRunCode();
    });

    // 5. Shift+F10 (IntelliJ / PyCharm)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F10, () => {
      handleRunCode();
    });

    // 6. Ctrl+F5 / Cmd+F5
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, () => {
      handleRunCode();
    });

    // Add keyboard shortcut Alt+N to quickly insert author name tag
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyN, () => {
      insertNameTag();
    });
  };

  // Global window keyboard shortcuts for running code anywhere on page (F9, F11, F5, Shift+F10, Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isRunShortcut =
        e.key === "F9" ||
        e.key === "F11" ||
        e.key === "F5" ||
        (e.shiftKey && e.key === "F10") ||
        ((e.ctrlKey || e.metaKey) && e.key === "Enter") ||
        ((e.ctrlKey || e.metaKey) && e.key === "F5");

      if (isRunShortcut) {
        // Prevent default browser behavior (e.g. F5 browser reload, F11 fullscreen)
        e.preventDefault();
        e.stopPropagation();
        handleRunCode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRunCode]);

  const currentLangObj = getLanguageById(language);

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden ${
        theme === "vs-dark" ? "bg-[#1e1e1e] text-gray-200" : "bg-white text-gray-800"
      }`}
    >
      {/* anil6 Top Navigation Bar */}
      <header
        className={`flex h-12 items-center justify-between px-3 sm:px-4 select-none border-b shrink-0 relative z-40 gap-2 overflow-visible ${
          theme === "vs-dark"
            ? "bg-[#1e1e1e] border-[#333333] text-gray-200"
            : "bg-[#f8f9fa] border-[#e0e0e0] text-gray-800"
        }`}
      >
        {/* Left: AM Logo and Anil6 Brand Name */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a href="/" className="flex items-center gap-2 group font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 border border-orange-400/60 text-white font-black text-sm tracking-wider select-none shadow-sm transition-transform duration-150 group-hover:scale-105">
              AM
            </div>
            <span className="font-bold tracking-tight text-base text-white">
              Anil<span className="text-orange-500 font-extrabold">6</span>
            </span>
          </a>
        </div>

        {/* Center / Right: Primary Compile Option & Language Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* COMPILE & RUN BUTTON (Prominent on Top) */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            title="Compile and execute code (F9 / F11 / F5 / Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span className="tracking-wide">Compiling...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white text-white" />
                <span className="tracking-wide">Compile & Run</span>
                <kbd className="hidden lg:inline-block ml-1 px-1 py-0.2 rounded bg-black/25 text-[10px] font-mono text-emerald-100/90 border border-white/20" title="Shortcuts: F9, F11, F5, Ctrl+Enter">
                  F9 / Ctrl+↵
                </kbd>
              </>
            )}
          </button>

          {/* Boilerplate Template Reset Button */}
          <button
            onClick={handleResetTemplate}
            className={`hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
              theme === "vs-dark"
                ? "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36] text-gray-400 hover:text-gray-200"
                : "bg-white border-gray-300 hover:bg-gray-100 text-gray-600"
            }`}
            title={`Reset to standard ${currentLangObj.name} boilerplate`}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden lg:inline text-[11px]">Template</span>
          </button>

          {/* Language Selector Dropdown with Full Language Suite */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border font-semibold transition-all cursor-pointer shadow-sm ${
                isLangOpen
                  ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-600/10 text-blue-400"
                  : theme === "vs-dark"
                  ? "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36] text-gray-200"
                  : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
              }`}
              title="Change programming language / compiler environment"
            >
              <FileCode className="h-3.5 w-3.5 text-blue-400" />
              <span>{currentLangObj.name}</span>
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                {currentLangObj.extension}
              </span>
              <ChevronDown
                className={`h-3 w-3 opacity-60 transition-transform duration-150 ${
                  isLangOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isLangOpen && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setIsLangOpen(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-2 z-[101] w-64 rounded-xl shadow-2xl border p-2 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ${
                    theme === "vs-dark"
                      ? "bg-[#16161a] border-[#33333e] text-gray-200 shadow-black/90"
                      : "bg-white border-gray-200 text-gray-800 shadow-xl"
                  }`}
                >
                  <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-gray-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      Languages & Compilers
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                      {SUPPORTED_LANGUAGES.length} Available
                    </span>
                  </div>

                  {/* Fast Search Input */}
                  <div className="mb-2 px-1">
                    <input
                      type="text"
                      placeholder="Search language (e.g. python, c++)..."
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      autoFocus
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none border transition-all ${
                        theme === "vs-dark"
                          ? "bg-[#202026] border-[#383844] text-white placeholder-gray-500 focus:border-blue-500"
                          : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  {/* Language Options List */}
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {SUPPORTED_LANGUAGES.filter(
                      (l) =>
                        l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
                        l.extension.toLowerCase().includes(langSearch.toLowerCase()) ||
                        l.id.toLowerCase().includes(langSearch.toLowerCase())
                    ).map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          handleLanguageChange(lang.id);
                          setLangSearch("");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                          language === lang.id
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : theme === "vs-dark"
                            ? "hover:bg-[#25252f] text-gray-300 hover:text-white"
                            : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lang.name}</span>
                          {lang.supportsExecution && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                                language === lang.id
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              ▶ Run
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono ${
                            language === lang.id ? "text-blue-100" : "text-gray-500"
                          }`}
                        >
                          {lang.extension}
                        </span>
                      </button>
                    ))}
                    {SUPPORTED_LANGUAGES.filter(
                      (l) =>
                        l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
                        l.extension.toLowerCase().includes(langSearch.toLowerCase()) ||
                        l.id.toLowerCase().includes(langSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-3 text-center text-xs text-gray-400">
                        No matching languages found
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "vs-dark" ? "vs-light" : "vs-dark")}
            className={`p-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
              theme === "vs-dark"
                ? "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36]"
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

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
              theme === "vs-dark"
                ? "bg-[#25252b] border-[#383842] hover:bg-[#2e2e36]"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
            title={`Download as ${currentLangObj.extension}`}
          >
            <Download className="h-3 w-3 opacity-70" />
            <span className="hidden md:inline">Download</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className={`p-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
              theme === "vs-dark"
                ? "bg-[#25252b] border-[#383842] hover:bg-red-950/40 hover:border-red-500/40 text-gray-400 hover:text-red-400"
                : "bg-white border-gray-300 hover:bg-red-50 text-gray-600 hover:text-red-600"
            }`}
            title="Clear notepad"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Share Button (Primary) */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Copied!</span>
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

      {/* Main Workspace Layout with Split-View Editor & Compilation Output Terminal */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Monaco Editor Container */}
        <main className="flex-1 h-full relative overflow-hidden watermark-notepad">
          {/* Background Wallpaper */}
          <div
            className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/avengers-bg.jpg')",
            }}
            aria-hidden="true"
          >
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
              language={currentLangObj.monacoLanguage || language}
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
                  Loading editor...
                </div>
              }
            />
          </div>
        </main>

        {/* Slide-Up / Dockable Compilation Output Terminal Panel */}
        {isOutputOpen && (
          <aside
            className={`flex flex-col border-t md:border-t-0 md:border-l border-[#333333] shadow-2xl z-20 transition-all duration-200 ${
              theme === "vs-dark" ? "bg-[#0f1319] text-gray-200" : "bg-[#f8f9fa] text-gray-800"
            } ${
              isOutputExpanded
                ? "h-full md:w-1/2 w-full"
                : "h-72 md:h-full md:w-96 w-full"
            }`}
          >
            {/* Output Panel Header */}
            <div
              className={`flex items-center justify-between px-3 py-2 border-b text-xs shrink-0 select-none ${
                theme === "vs-dark"
                  ? "bg-[#161b22] border-[#2b313a]"
                  : "bg-[#e9ecef] border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-bold">Output Console</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {currentLangObj.name}
                </span>

                {executionResult && (
                  <div className="flex items-center gap-1.5 ml-1">
                    {executionResult.exitCode === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30">
                        <AlertTriangle className="h-3 w-3" />
                        Exit {executionResult.exitCode}
                      </span>
                    )}

                    {executionResult.executionTimeMs !== undefined && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {executionResult.executionTimeMs}ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Panel Header Controls */}
              <div className="flex items-center gap-1">
                {/* HTML Mode Tab Switcher */}
                {language === "html" && (
                  <div className="flex items-center bg-[#21262d] p-0.5 rounded-lg border border-[#30363d] mr-1">
                    <button
                      onClick={() => setActiveOutputTab("output")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        activeOutputTab === "output"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Raw
                    </button>
                    <button
                      onClick={() => setActiveOutputTab("preview")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        activeOutputTab === "preview"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      Live Preview
                    </button>
                  </div>
                )}

                {/* Copy Output Button */}
                {executionResult && (
                  <button
                    onClick={handleCopyOutput}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors cursor-pointer"
                    title="Copy terminal output"
                  >
                    {copiedOutput ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}

                {/* Clear Output */}
                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors cursor-pointer"
                  title="Clear output"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Expand / Minimize Width Toggle (Desktop) */}
                <button
                  onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                  className="hidden md:block p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors cursor-pointer"
                  title={isOutputExpanded ? "Standard width" : "Expand width"}
                >
                  {isOutputExpanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Close Output Panel */}
                <button
                  onClick={() => setIsOutputOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors cursor-pointer"
                  title="Close console"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Input (stdin) Section for interactive programs like Python input(), C++ cin, etc. */}
            <div className="border-b border-[#21262d] bg-[#0d1117] px-3 py-2 text-xs shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className="flex items-center gap-1.5 font-semibold text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer text-[11px]"
                  title="Toggle Custom Input (stdin) for input(), cin, Scanner"
                >
                  <Terminal className="h-3 w-3 text-emerald-400" />
                  <span>Custom Input (stdin)</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {showCustomInput ? "▲ hide" : "▼ enter input"}
                  </span>
                  {customInput.trim() && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {customInput && (
                    <button
                      onClick={() => setCustomInput("")}
                      className="text-[10px] text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer disabled:opacity-50"
                    title="Run with this input"
                  >
                    <Play className="h-2.5 w-2.5 fill-white" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
              {showCustomInput && (
                <div className="mt-1.5">
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter input here (e.g. for input(), cin, Scanner). For multiple inputs, put each on a new line."
                    rows={2}
                    className="w-full bg-[#161b22] border border-[#30363d] focus:border-emerald-500/60 rounded-md p-2 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none resize-y transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Output Panel Body */}
            <div className="flex-1 p-3 overflow-auto font-mono text-xs select-text bg-[#090d13]">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center h-full gap-2.5 text-gray-400">
                  <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Compiling & running {currentLangObj.name}...
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Communicating with sandbox runtime
                  </span>
                </div>
              ) : language === "html" && activeOutputTab === "preview" ? (
                <div className="w-full h-full rounded-lg bg-white overflow-hidden shadow-inner flex flex-col">
                  <iframe
                    srcDoc={code}
                    title="Live HTML Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                  />
                </div>
              ) : executionResult ? (
                <div className="space-y-3">
                  {/* Visual Data Table Rendering for SQL Queries */}
                  {executionResult.sqlResults && executionResult.sqlResults.length > 0 ? (
                    <div className="space-y-3">
                      {executionResult.sqlResults.map((res, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-[#0e131d] border border-[#232a3b] overflow-hidden shadow-lg"
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-[#141b29] border-b border-[#232a3b]">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
                                Query #{i + 1}
                              </span>
                              <span
                                className="text-[11px] font-mono text-gray-300 truncate max-w-[200px] sm:max-w-xs"
                                title={res.query}
                              >
                                {res.query.split("\n")[0]}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {res.isSelect ? (
                                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                                  {res.rowCount} {res.rowCount === 1 ? "row" : "rows"}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                                  {res.rowCount} affected
                                </span>
                              )}
                            </div>
                          </div>

                          {res.isSelect && res.headers && res.rows ? (
                            <div className="w-full overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs font-mono min-w-full">
                                <thead>
                                  <tr className="bg-[#182133] border-b border-[#2d374d]">
                                    <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-[#232a3b] w-10 text-center select-none bg-[#141b29]">
                                      #
                                    </th>
                                    {res.headers.map((h, hIdx) => (
                                      <th
                                        key={hIdx}
                                        className="py-2 px-3 text-[11px] font-bold text-cyan-300 border-r border-[#232a3b] last:border-r-0 whitespace-nowrap bg-[#182133]"
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {res.rows.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={res.headers.length + 1}
                                        className="py-4 text-center text-gray-500 italic bg-[#0b0f17]"
                                      >
                                        (0 rows returned)
                                      </td>
                                    </tr>
                                  ) : (
                                    res.rows.map((row, rIdx) => (
                                      <tr
                                        key={rIdx}
                                        className={`border-b border-[#1b2233] transition-colors hover:bg-cyan-950/20 ${
                                          rIdx % 2 === 0 ? "bg-[#0b0f17]" : "bg-[#0f1420]"
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-[10px] text-gray-500 border-r border-[#1b2233] text-center select-none">
                                          {rIdx + 1}
                                        </td>
                                        {row.map((cell, cIdx) => (
                                          <td
                                            key={cIdx}
                                            className={`py-2 px-3 text-xs border-r border-[#1b2233] last:border-r-0 whitespace-nowrap ${
                                              cell === "NULL"
                                                ? "text-gray-500 italic"
                                                : "text-gray-200"
                                            }`}
                                          >
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-3 text-xs font-mono text-emerald-300 flex items-center gap-2 bg-[#0b0f17]">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>{res.message || "Query executed successfully"}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    executionResult.stdout && (
                      <div className="rounded-lg bg-emerald-950/10 border border-emerald-500/20 p-3">
                        <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">
                          Standard Output
                        </div>
                        <pre className="text-emerald-300 whitespace-pre leading-relaxed font-mono overflow-x-auto selection:bg-emerald-800/40">
                          {executionResult.stdout}
                        </pre>
                      </div>
                    )
                  )}

                  {executionResult.stderr && (
                    <div className="rounded-lg bg-red-950/30 border border-red-500/30 p-3">
                      <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Compiler / Runtime Diagnostic
                      </div>
                      <pre className="text-red-300 whitespace-pre leading-relaxed font-mono overflow-x-auto selection:bg-red-800/40">
                        {executionResult.stderr}
                      </pre>
                    </div>
                  )}

                  {!executionResult.stdout && !executionResult.stderr && (!executionResult.sqlResults || executionResult.sqlResults.length === 0) && (
                    <div className="text-gray-400 italic p-3 text-center">
                      Program finished successfully with no standard output (Exit Code: {executionResult.exitCode}).
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-2 p-4">
                  <Terminal className="h-8 w-8 text-gray-600 mb-1" />
                  <p className="text-xs font-semibold text-gray-300">
                    No compilation results yet
                  </p>
                  <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                    Click the green <span className="text-emerald-400 font-semibold">Compile & Run</span> button at the top or press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono text-[10px]">F9</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono text-[10px]">F11</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono text-[10px]">Ctrl+Enter</kbd> to execute your {currentLangObj.name} code.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer
        className={`h-7 border-t px-3 flex items-center justify-between text-[11px] font-mono select-none z-30 shrink-0 ${
          theme === "vs-dark"
            ? "bg-[#18181c] border-[#2e2e38] text-gray-400"
            : "bg-[#f1f3f5] border-[#dee2e6] text-gray-600"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
            title="Compile and run code (F9 / F11 / F5 / Ctrl+Enter)"
          >
            <Play className="h-2.5 w-2.5 fill-emerald-400" />
            <span>Run Code (F9 / Ctrl+↵)</span>
          </button>
          <span className="opacity-30">|</span>
          <span className="flex items-center gap-1 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Room: /{roomId}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="hidden sm:inline">UTF-8</span>
          <span className="opacity-30 hidden sm:inline">|</span>
          <span className="font-semibold text-blue-400">{currentLangObj.name}</span>
          <span className="opacity-30">|</span>
          <button
            onClick={() => setIsOutputOpen(!isOutputOpen)}
            className="hover:text-blue-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <Terminal className="h-3 w-3" />
            <span>Console Output</span>
          </button>
        </div>
      </footer>

      {/* Share Workspace Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsShareModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-5 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Share Workspace</h3>
                  <p className="text-[11px] text-gray-400">Collaborate with anyone in real time</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-300">Room Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl || (typeof window !== "undefined" ? window.location.href : "")}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs font-mono text-gray-200 outline-none select-all focus:border-orange-500"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {copiedLink && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Link copied to clipboard!
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-xs">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Join my collaborative code session on Anil6: " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-emerald-400 font-medium transition-colors cursor-pointer"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("Join my Anil6 coding session")}&body=${encodeURIComponent("Join my real-time collaborative workspace: " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-blue-400 font-medium transition-colors cursor-pointer"
              >
                <span>Email</span>
              </a>
              <button
                onClick={() => window.open(window.location.href, "_blank")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-medium transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>New Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
