"use client";

import { useState } from "react";
import {
  Play,
  Copy,
  Check,
  Download,
  Settings,
  ChevronDown,
  Sparkles,
  Code,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageById } from "@/lib/languages";

interface EditorToolbarProps {
  language: string;
  theme: string;
  fontSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  isRunning: boolean;
  onLanguageChange: (lang: string) => void;
  onThemeChange: (theme: string) => void;
  onFontSizeChange: (delta: number) => void;
  onToggleWordWrap: () => void;
  onToggleMinimap: () => void;
  onRunCode: () => void;
  onCopyCode: () => void;
  onDownloadCode: () => void;
  onResetCode: () => void;
  onOpenSettings: () => void;
}

export function EditorToolbar({
  language,
  theme,
  fontSize,
  wordWrap,
  minimap,
  isRunning,
  onLanguageChange,
  onThemeChange,
  onFontSizeChange,
  onToggleWordWrap,
  onToggleMinimap,
  onRunCode,
  onCopyCode,
  onDownloadCode,
  onResetCode,
  onOpenSettings,
}: EditorToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const currentLang = getLanguageById(language);

  const handleCopy = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between border-b border-ide-border bg-[#121720] px-3 py-2 text-xs select-none gap-2 overflow-x-auto">
      {/* Left Group: Language selector & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-ide-border bg-[#181f2b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-ide-hover hover:border-gray-600 transition-all cursor-pointer"
          >
            <FileCode className="h-3.5 w-3.5 text-blue-400" />
            <span>{currentLang.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-0.5" />
          </button>

          {isLangDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLangDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 z-50 w-52 rounded-xl border border-ide-border bg-[#161b22] py-1 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 border-b border-ide-border/50">
                  Select Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      onLanguageChange(lang.id);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                      language === lang.id
                        ? "bg-blue-600/20 text-blue-400 font-semibold"
                        : "text-gray-300 hover:bg-[#21262d] hover:text-white"
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {lang.extension}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Reset Template button */}
        <button
          onClick={onResetCode}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-ide-border/60 bg-[#161b22] px-2.5 py-1.5 text-gray-300 hover:text-white hover:bg-ide-hover transition-colors cursor-pointer"
          title="Reset to default language boilerplate"
        >
          <RotateCcw className="h-3 w-3 text-gray-400" />
          <span className="hidden md:inline text-[11px]">Template</span>
        </button>
      </div>

      {/* Center/Right Group: Action controls & Run */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Run Code Button */}
        <button
          onClick={onRunCode}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 shadow-sm shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          title="Execute code (Ctrl+Enter / Cmd+Enter)"
        >
          {isRunning ? (
            <>
              <div className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Run Code</span>
            </>
          )}
        </button>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-ide-border/80 bg-[#181f2b] px-2.5 py-1.5 text-gray-300 hover:text-white hover:bg-ide-hover transition-all cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-gray-400" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>

        {/* Download Button */}
        <button
          onClick={onDownloadCode}
          className="flex items-center gap-1.5 rounded-lg border border-ide-border/80 bg-[#181f2b] px-2.5 py-1.5 text-gray-300 hover:text-white hover:bg-ide-hover transition-all cursor-pointer"
          title={`Download as ${currentLang.extension}`}
        >
          <Download className="h-3.5 w-3.5 text-gray-400" />
          <span className="hidden sm:inline">Download</span>
        </button>

        <div className="h-4 w-px bg-ide-border mx-1 hidden sm:block" />

        {/* Quick Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg border border-ide-border/70 bg-[#181f2b] text-gray-400 hover:text-white hover:bg-ide-hover transition-colors cursor-pointer"
          title="Editor preferences"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
