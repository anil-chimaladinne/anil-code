"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Code2,
  LogIn,
  Plus,
  ArrowRight,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { generateRoomId } from "@/lib/utils";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("codeconnect_recent_rooms");
      if (saved) {
        setRecentRooms(JSON.parse(saved).slice(0, 5));
      }
    } catch {}
  }, []);

  const cleanRoomCode = (input: string) => {
    let trimmed = input.trim();
    if (trimmed.includes("/room/")) {
      const parts = trimmed.split("/room/");
      trimmed = parts[1]?.split("?")[0]?.split("#")[0] || trimmed;
    }
    return trimmed;
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = cleanRoomCode(roomIdInput);

    if (!cleanId) {
      setError("Please enter a valid Room ID or link.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/rooms/${cleanId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            "Room not found. Please check the link and try again."
        );
        setIsLoading(false);
        return;
      }

      // Save to recent rooms
      try {
        const updated = [
          cleanId,
          ...recentRooms.filter((r) => r !== cleanId),
        ].slice(0, 5);
        localStorage.setItem(
          "codeconnect_recent_rooms",
          JSON.stringify(updated)
        );
      } catch {}

      router.push(`/room/${cleanId}`);
    } catch (err: any) {
      setError("Unable to connect to room. Please try again.");
      setIsLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    const newRoomId = generateRoomId();
    router.push(`/room/${newRoomId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090d13]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="glass-panel rounded-2xl p-7 sm:p-8 shadow-2xl border border-ide-border/80">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Join a Room
                </h1>
                <p className="text-xs text-gray-400">
                  Enter a room ID or paste a full shared URL
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label
                  htmlFor="roomId"
                  className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2"
                >
                  Room ID or URL
                </label>
                <div className="relative">
                  <input
                    id="roomId"
                    type="text"
                    placeholder="e.g. swift-code-429 or https://..."
                    value={roomIdInput}
                    onChange={(e) => {
                      setRoomIdInput(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full rounded-xl border border-ide-border bg-ide-panel/80 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Join Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center justify-between">
              <span className="h-px flex-1 bg-ide-border/60" />
              <span className="px-3 text-xs uppercase tracking-wider text-gray-500">
                or
              </span>
              <span className="h-px flex-1 bg-ide-border/60" />
            </div>

            <button
              onClick={handleQuickCreate}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-ide-border bg-ide-panel/60 py-3 text-sm font-medium text-gray-300 hover:bg-ide-hover hover:text-white hover:border-gray-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-blue-400" />
              <span>Create a New Room Instead</span>
            </button>

            {/* Recent rooms list */}
            {recentRooms.length > 0 && (
              <div className="mt-8 pt-6 border-t border-ide-border/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-3">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Recently Joined Rooms</span>
                </div>
                <div className="space-y-1.5">
                  {recentRooms.map((rId) => (
                    <button
                      key={rId}
                      onClick={() => {
                        setRoomIdInput(rId);
                        router.push(`/room/${rId}`);
                      }}
                      className="w-full flex items-center justify-between rounded-lg bg-ide-panel/40 px-3 py-2 text-xs font-mono text-gray-300 hover:bg-ide-hover hover:text-white transition-all text-left group"
                    >
                      <span className="truncate">{rId}</span>
                      <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-blue-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
