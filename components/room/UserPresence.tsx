"use client";

import { useState } from "react";
import { Users, X, Check, Edit2, Sparkles, Circle } from "lucide-react";
import { RemoteUser } from "@/lib/socket-client";
import { USER_COLORS } from "@/lib/utils";

interface UserPresenceProps {
  users: RemoteUser[];
  currentUser: { name: string; color: string; id: string };
  onUpdateProfile: (name: string, color: string) => void;
  onClose: () => void;
}

export function UserPresence({
  users,
  currentUser,
  onUpdateProfile,
  onClose,
}: UserPresenceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [selectedColor, setSelectedColor] = useState(currentUser.color);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateProfile(nameInput.trim(), selectedColor);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-ide-border bg-[#121722] p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ide-border/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Connected Developers ({users.length || 1})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Profile Customization Section */}
        {isEditing ? (
          <form onSubmit={handleSave} className="mb-4 p-3 rounded-xl bg-[#181f2c] border border-ide-border space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
                className="w-full rounded-lg border border-ide-border bg-[#0d1117] px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                Avatar Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className="h-5 w-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-3 flex items-center justify-between p-2 rounded-xl bg-[#181f2c] border border-ide-border">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] font-normal text-blue-400">(You)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-400 px-2 py-1 rounded hover:bg-ide-hover transition-colors"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id || u.socketId === currentUser.id;
            return (
              <div
                key={u.socketId || u.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0d1117]/60 hover:bg-[#161b22] transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: u.color || "#3b82f6" }}
                  >
                    {(u.name || "G").charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-200 truncate max-w-[120px]">
                    {u.name}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] text-blue-400 font-normal">
                      (You)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-gray-500">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
