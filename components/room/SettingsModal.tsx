"use client";

import { X, Sliders, Moon, Sun, Type, LayoutTemplate } from "lucide-react";

interface SettingsModalProps {
  settings: {
    fontSize: number;
    theme: string;
    wordWrap: "on" | "off";
    minimap: boolean;
    tabSize: number;
  };
  onUpdate: (newSettings: any) => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdate,
  onClose,
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-ide-border bg-[#10151d] p-6 shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ide-border/60 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Editor Preferences
              </h2>
              <p className="text-xs text-gray-400">
                Customize your coding workspace
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

        {/* Settings Form */}
        <div className="space-y-4 text-xs">
          {/* Theme */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161b24] border border-ide-border">
            <div>
              <div className="font-semibold text-gray-200">Editor Theme</div>
              <div className="text-[11px] text-gray-400">
                Visual styling & syntax theme
              </div>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => onUpdate({ ...settings, theme: e.target.value })}
              className="rounded-lg border border-ide-border bg-[#0d1117] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="vs-dark">Dark (Default)</option>
              <option value="vs-light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161b24] border border-ide-border">
            <div>
              <div className="font-semibold text-gray-200">Font Size</div>
              <div className="text-[11px] text-gray-400">
                Current: {settings.fontSize}px
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onUpdate({
                    ...settings,
                    fontSize: Math.max(10, settings.fontSize - 1),
                  })
                }
                className="h-7 w-7 rounded-lg border border-ide-border bg-[#0d1117] text-gray-200 hover:bg-ide-hover flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="w-8 text-center font-mono font-semibold text-white">
                {settings.fontSize}
              </span>
              <button
                onClick={() =>
                  onUpdate({
                    ...settings,
                    fontSize: Math.min(28, settings.fontSize + 1),
                  })
                }
                className="h-7 w-7 rounded-lg border border-ide-border bg-[#0d1117] text-gray-200 hover:bg-ide-hover flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161b24] border border-ide-border">
            <div>
              <div className="font-semibold text-gray-200">Word Wrap</div>
              <div className="text-[11px] text-gray-400">
                Wrap long lines automatically
              </div>
            </div>
            <button
              onClick={() =>
                onUpdate({
                  ...settings,
                  wordWrap: settings.wordWrap === "on" ? "off" : "on",
                })
              }
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                settings.wordWrap === "on"
                  ? "bg-blue-600 text-white"
                  : "bg-ide-panel text-gray-400 border border-ide-border hover:text-white"
              }`}
            >
              {settings.wordWrap === "on" ? "Enabled" : "Disabled"}
            </button>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161b24] border border-ide-border">
            <div>
              <div className="font-semibold text-gray-200">Minimap</div>
              <div className="text-[11px] text-gray-400">
                Code overview side thumbnail
              </div>
            </div>
            <button
              onClick={() =>
                onUpdate({
                  ...settings,
                  minimap: !settings.minimap,
                })
              }
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                settings.minimap
                  ? "bg-blue-600 text-white"
                  : "bg-ide-panel text-gray-400 border border-ide-border hover:text-white"
              }`}
            >
              {settings.minimap ? "Shown" : "Hidden"}
            </button>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#161b24] border border-ide-border">
            <div>
              <div className="font-semibold text-gray-200">Tab Indentation</div>
              <div className="text-[11px] text-gray-400">Spaces per tab</div>
            </div>
            <select
              value={settings.tabSize}
              onChange={(e) =>
                onUpdate({ ...settings, tabSize: parseInt(e.target.value, 10) })
              }
              className="rounded-lg border border-ide-border bg-[#0d1117] px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
