"use client";

import { useState } from "react";
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ExecutionResult } from "@/lib/execution";

interface OutputPanelProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OutputPanel({
  result,
  isRunning,
  onClear,
  isCollapsed = false,
  onToggleCollapse,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<"output" | "preview">("output");
  const [copied, setCopied] = useState(false);

  const handleCopyOutput = () => {
    if (!result) return;
    const text = result.stdout || result.stderr;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHtml = result?.isHtmlPreview;

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] border-t md:border-t-0 md:border-l border-ide-border overflow-hidden select-text">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-ide-border bg-[#121720] px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-gray-200">
            <Terminal className="h-3.5 w-3.5 text-blue-400" />
            <span>Output Terminal</span>
          </div>

          {result && (
            <div className="flex items-center gap-2 ml-2">
              {result.exitCode === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Success
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  Error
                </span>
              )}

              {result.executionTimeMs !== undefined && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  {result.executionTimeMs}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isHtml && (
            <div className="flex items-center bg-[#181f2b] p-0.5 rounded-lg border border-ide-border mr-1">
              <button
                onClick={() => setActiveTab("output")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activeTab === "output"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  activeTab === "preview"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          )}

          {result && (
            <button
              onClick={handleCopyOutput}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-ide-hover transition-colors"
              title="Copy output"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <button
            onClick={onClear}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-ide-hover transition-colors"
            title="Clear output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Body */}
      <div className="flex-1 p-3 overflow-auto font-mono text-xs sm:text-sm bg-[#090d13]">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs">Executing code in sandbox...</span>
          </div>
        ) : isHtml && activeTab === "preview" && result?.stdout ? (
          <div className="w-full h-full rounded-lg bg-white overflow-hidden shadow-inner">
            <iframe
              srcDoc={result.stdout}
              title="HTML Sandbox Output"
              className="w-full h-full border-0"
              sandbox="allow-scripts"
            />
          </div>
        ) : result ? (
          <div className="space-y-3">
            {result.stdout && (
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed font-mono">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="text-red-400 whitespace-pre-wrap leading-relaxed font-mono bg-red-950/20 p-2.5 rounded-lg border border-red-500/20">
                {result.stderr}
              </pre>
            )}
            {!result.stdout && !result.stderr && (
              <div className="text-gray-500 italic">
                Program completed with no output (Exit Code: {result.exitCode}).
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-2 p-6">
            <Terminal className="h-8 w-8 text-gray-600 mb-1" />
            <p className="text-xs font-medium text-gray-400">
              No output to display yet.
            </p>
            <p className="text-[11px] text-gray-500">
              Click <span className="text-emerald-400 font-semibold">Run Code</span> or press <kbd className="px-1.5 py-0.5 rounded bg-ide-panel border border-ide-border text-gray-300 font-mono text-[10px]">Ctrl+Enter</kbd> to execute.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
