"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Skip tracking for the admin page itself to avoid noise
    if (pathname.startsWith("/admin")) return;

    // Track path changes
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    try {
      const payload = {
        page: pathname || "/",
        referrer: typeof document !== "undefined" ? document.referrer || "Direct" : "Direct",
        screenSize:
          typeof window !== "undefined"
            ? `${window.screen.width}x${window.screen.height}`
            : undefined,
        language: typeof navigator !== "undefined" ? navigator.language : undefined,
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      };

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [pathname]);

  return null;
}
