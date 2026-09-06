"use client";

import {
  Wifi,
  WifiOff,
  Check,
  RotateCw,
  HardDrive,
  FileCode,
  Users,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface StatusBarProps {
  connectionStatus: "connected" | "connecting" | "disconnected";
  usersCount: number;
  charCount: number;
  lineCount: number;
  cursorPos: { lineNumber: number; column: number };
  saveStatus: "saved" | "saving" | "unsaved";
  lastSavedAt: Date | null;
  language: string;
}

export function StatusBar({
  connectionStatus,
  usersCount,
  charCount,
  lineCount,
  cursorPos,
  saveStatus,
  lastSavedAt,
  language,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-ide-border bg-[#0d1117] px-3 py-1.5 text-[11px] text-gray-400 font-mono select-none">
      {/* Left side: Connection and sync status */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === "connected" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-300 font-sans font-medium text-xs">
                Connected
              </span>
            </>
          ) : connectionStatus === "connecting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-amber-400 font-sans font-medium text-xs">
                Reconnecting...
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-sans font-medium text-xs">
                Offline
              </span>
            </>
          )}
        </div>

        {/* Active peers */}
        <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
          <Users className="h-3 w-3 text-blue-400" />
          <span>
            {usersCount} {usersCount === 1 ? "user" : "users"} online
          </span>
        </div>

        {/* Auto-save */}
        <div className="flex items-center gap-1.5 text-gray-400">
          {saveStatus === "saving" ? (
            <>
              <RotateCw className="h-3 w-3 text-amber-400 animate-spin" />
              <span className="text-amber-400">Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span>
                {lastSavedAt
                  ? `Saved ${formatTimeAgo(lastSavedAt)}`
                  : "Saved"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side: Cursor, characters, language */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:inline">
          Ln {cursorPos.lineNumber}, Col {cursorPos.column}
        </div>

        <div className="hidden md:inline">
          {lineCount} lines, {charCount} chars
        </div>

        <div className="rounded bg-ide-panel px-2 py-0.5 text-gray-300 uppercase font-semibold text-[10px] border border-ide-border">
          {language}
        </div>
      </div>
    </div>
  );
}
