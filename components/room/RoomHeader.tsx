"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  Share2,
  LogOut,
  Users,
  Copy,
  Check,
  Circle,
  Settings,
  Sparkles,
} from "lucide-react";
import { RemoteUser } from "@/lib/socket-client";
import { ShareModal } from "./ShareModal";
import { UserPresence } from "./UserPresence";
import { SettingsModal } from "./SettingsModal";

interface RoomHeaderProps {
  roomId: string;
  users: RemoteUser[];
  currentUser: { name: string; color: string; id: string };
  connectionStatus: "connected" | "connecting" | "disconnected";
  onUpdateProfile: (name: string, color: string) => void;
  editorSettings: {
    fontSize: number;
    theme: string;
    wordWrap: "on" | "off";
    minimap: boolean;
    tabSize: number;
  };
  onUpdateSettings: (newSettings: any) => void;
}

export function RoomHeader({
  roomId,
  users,
  currentUser,
  connectionStatus,
  onUpdateProfile,
  editorSettings,
  onUpdateSettings,
}: RoomHeaderProps) {
  const router = useRouter();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPresenceOpen, setIsPresenceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomId);
    setCopiedRoomCode(true);
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  const handleLeaveRoom = () => {
    if (confirm("Are you sure you want to leave this coding room?")) {
      router.push("/");
    }
  };

  return (
    <>
      <header className="h-14 border-b border-ide-border bg-[#0d1117] px-4 flex items-center justify-between select-none shrink-0 z-30">
        {/* Left Side: Brand & Room ID */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden md:inline">
              Code<span className="text-blue-400">Connect</span>
            </span>
          </Link>

          <div className="h-4 w-px bg-ide-border hidden md:block" />

          {/* Room code badge */}
          <div
            onClick={handleCopyCode}
            className="flex items-center gap-2 rounded-lg border border-ide-border/80 bg-[#161b22] px-2.5 py-1 text-xs font-mono text-gray-300 hover:border-gray-500 hover:text-white transition-all cursor-pointer group"
            title="Click to copy room code"
          >
            <span className="text-gray-500 hidden sm:inline">Room:</span>
            <span className="font-semibold text-blue-400">{roomId}</span>
            {copiedRoomCode ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500 group-hover:text-gray-300" />
            )}
          </div>
        </div>

        {/* Right Side: Presence, Share, Settings, Leave */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Presence & Profile Button */}
          <div className="relative">
            <button
              onClick={() => setIsPresenceOpen(!isPresenceOpen)}
              className="flex items-center gap-2 rounded-lg border border-ide-border/70 bg-[#161b22] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-ide-hover hover:text-white transition-all cursor-pointer"
            >
              {/* Colored avatar circle */}
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium max-w-[90px] truncate">
                {currentUser.name}
              </span>

              {/* Online user count badge */}
              <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                <Users className="h-2.5 w-2.5" />
                {users.length || 1}
              </span>
            </button>

            {isPresenceOpen && (
              <UserPresence
                users={users}
                currentUser={currentUser}
                onUpdateProfile={onUpdateProfile}
                onClose={() => setIsPresenceOpen(false)}
              />
            )}
          </div>

          {/* Share Room Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share Room</span>
            <span className="sm:hidden">Share</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 rounded-lg border border-ide-border/70 bg-[#161b22] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-red-950/40 hover:border-red-500/40 hover:text-red-300 transition-all cursor-pointer"
            title="Leave room"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <ShareModal
          roomId={roomId}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Editor Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={editorSettings}
          onUpdate={onUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
}
