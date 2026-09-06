"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Users,
  Terminal,
  Copy,
  Check,
  Play,
} from "lucide-react";
import { generateRoomId } from "@/lib/utils";

export function HeroSection() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const sampleSnippet = `// Live Collaboration in CodeConnect
function startPairSession(room) {
  const session = CodeConnect.join(room);
  session.onSync((peers) => {
    console.log(\`⚡ Connected with \${peers.length} developers!\`);
  });
}

startPairSession("cosmic-orbit-49");`;

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const newRoomId = generateRoomId();

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCode: newRoomId, language: "javascript" }),
      });

      if (res.ok) {
        router.push(`/room/${newRoomId}`);
      } else {
        // Fallback direct navigate
        router.push(`/room/${newRoomId}`);
      }
    } catch {
      router.push(`/room/${newRoomId}`);
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(sampleSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text & Actions */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium text-blue-400 mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              <span>Real-Time Code Collaboration — No Account Needed</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Share code. <br />
              <span className="gradient-text">Collaborate instantly.</span>
            </h1>

            <p className="mt-6 text-lg text-gray-300 max-w-xl leading-relaxed">
              A fast, simple, and powerful way to share code with friends,
              classmates, and developers. Spin up a live room in one click and
              start writing code together with zero setup.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/40 active:scale-[0.98] transition-all disabled:opacity-75 cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Create Room</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>

              <Link
                href="/join"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-ide-border bg-ide-panel/90 px-6 py-3.5 text-sm font-semibold text-gray-200 hover:bg-ide-hover hover:text-white hover:border-gray-600 transition-all shadow-sm"
              >
                <Users className="h-4 w-4 text-gray-400" />
                <span>Join Room</span>
              </Link>
            </div>

            {/* Live indicators */}
            <div className="mt-8 flex items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Sub-millisecond sync</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-blue-400" />
                <span>12+ Languages</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Instant Run</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Editor Mockup */}
          <div className="lg:col-span-6 w-full">
            <div className="relative rounded-2xl border border-ide-border bg-[#10151d] shadow-2xl overflow-hidden group">
              {/* Window Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border/70 bg-[#0d1117]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-2 text-xs font-mono text-gray-400 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    room/cosmic-orbit-49.js
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Active users preview */}
                  <div className="flex items-center -space-x-1.5">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[#0d1117]">
                      A
                    </div>
                    <div className="h-6 w-6 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[#0d1117]">
                      D
                    </div>
                    <div className="h-6 w-6 rounded-full bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[#0d1117]">
                      G
                    </div>
                  </div>

                  <button
                    onClick={handleCopySnippet}
                    className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-ide-hover transition-colors"
                    title="Copy snippet"
                  >
                    {copiedSnippet ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Code preview area */}
              <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm text-gray-300 leading-relaxed overflow-x-auto bg-[#0a0e14]">
                <pre className="whitespace-pre">
                  <code>
                    <span className="text-gray-500">
                      {"// Live Collaboration in CodeConnect\n"}
                    </span>
                    <span className="text-purple-400">function </span>
                    <span className="text-blue-400">startPairSession</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-orange-300">room</span>
                    <span className="text-gray-400">) {"{\n"}</span>
                    {"  "}
                    <span className="text-purple-400">const </span>
                    <span className="text-yellow-300">session </span>
                    <span className="text-gray-400">= </span>
                    <span className="text-cyan-400">CodeConnect</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-blue-400">join</span>
                    <span className="text-gray-400">(room);\n\n  </span>
                    <span className="text-yellow-300">session</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-blue-400">onSync</span>
                    <span className="text-gray-400">((</span>
                    <span className="text-orange-300">peers</span>
                    <span className="text-gray-400">) =&gt; {"{\n"}    </span>
                    <span className="text-emerald-400">console</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-blue-400">log</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-300">
                      {`\`⚡ Connected with \${peers.length} developers!\``}
                    </span>
                    <span className="text-gray-400">);\n  {"});\n}"}\n\n</span>
                    <span className="text-blue-400">startPairSession</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-green-300">"cosmic-orbit-49"</span>
                    <span className="text-gray-400">);</span>
                  </code>
                </pre>
              </div>

              {/* Mini console output bar */}
              <div className="border-t border-ide-border/70 bg-[#0d1117] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Play className="h-3 w-3 fill-emerald-400" />
                  <span>Output: ⚡ Connected with 3 developers!</span>
                </div>
                <span className="text-gray-500 text-[11px]">runtime: 14ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
