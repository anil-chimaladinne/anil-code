"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the default room: /6
    router.replace("/6");
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1e1e1e] text-gray-300 font-mono text-sm">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span>Loading /6 notepad...</span>
      </div>
    </div>
  );
}
