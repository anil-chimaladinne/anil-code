"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  Globe,
  Lock,
  QrCode,
  Sparkles,
} from "lucide-react";

interface ShareModalProps {
  roomId: string;
  onClose: () => void;
}

export function ShareModal({ roomId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/room/${roomId}`;
      setShareUrl(url);
      if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
        setCanShare(true);
      }
    }
  }, [roomId]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
      try {
        await navigator.share({
          title: `Collaborate on CodeConnect (${roomId})`,
          text: `Join my live coding room on CodeConnect!`,
          url: shareUrl,
        });
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-ide-border bg-[#10151d] p-6 shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ide-border/60 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Share this room
              </h2>
              <p className="text-xs text-gray-400">
                Anyone with this link can join and collaborate
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-ide-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Share Link Box */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Shareable URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-ide-border bg-[#0d1117] px-3.5 py-2.5 text-xs text-gray-200 font-mono focus:outline-none select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-md shadow-blue-600/20 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Room ID Box */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Room ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={roomId}
                className="flex-1 rounded-xl border border-ide-border bg-[#0d1117] px-3.5 py-2 text-xs text-blue-400 font-mono focus:outline-none select-all font-semibold"
              />
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 rounded-xl border border-ide-border bg-ide-panel hover:bg-ide-hover text-gray-300 hover:text-white px-3 py-2 text-xs font-medium transition-all cursor-pointer shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Web Share API */}
          {canShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-ide-border/80 bg-[#161b22] py-2.5 text-xs font-semibold text-gray-200 hover:bg-ide-hover hover:text-white transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Share via Device Sheet</span>
            </button>
          )}

          {/* Notice */}
          <div className="rounded-xl bg-blue-950/20 border border-blue-500/20 p-3 flex items-start gap-2.5 text-xs text-blue-300/90">
            <Globe className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              Anyone with this link can join this room instantly without logging in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
