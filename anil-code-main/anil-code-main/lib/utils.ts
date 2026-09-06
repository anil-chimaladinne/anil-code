import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomId(): string {
  // Generate friendly readable or random short code e.g. "code-7x9q2"
  const adjectives = [
    "swift",
    "hyper",
    "cyber",
    "pixel",
    "sonic",
    "atomic",
    "cosmic",
    "lunar",
    "solar",
    "binary",
    "quantum",
    "vector",
    "matrix",
    "vortex",
    "delta",
    "apex",
  ];
  const nouns = [
    "code",
    "node",
    "flux",
    "byte",
    "core",
    "link",
    "flow",
    "stack",
    "grid",
    "forge",
    "orbit",
    "pulse",
    "spark",
    "sync",
    "hub",
    "room",
  ];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${randomAdj}-${randomNoun}-${randomNum}`;
}

export const USER_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#a855f7", // Violet
  "#e11d48", // Rose
];

export function getRandomUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export function generateGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest-${num}`;
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
