import Link from "next/link";
import { Code2, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-ide-border bg-[#070a0f] py-12 text-sm text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-white tracking-tight text-base">
              Code<span className="text-blue-400">Connect</span>
            </span>
            <span className="text-xs text-gray-500">
              — Modern Real-Time Code Sharing
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/join" className="hover:text-white transition-colors">
              Join Room
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span className="text-gray-600">|</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>

        <div className="mt-8 border-t border-ide-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} CodeConnect. Built for developers worldwide.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for seamless real-time collaboration.
          </p>
        </div>
      </div>
    </footer>
  );
}
