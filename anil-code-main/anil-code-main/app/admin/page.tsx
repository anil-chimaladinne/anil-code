"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Eye,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Search,
  Trash2,
  Download,
  Lock,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Filter,
} from "lucide-react";
import { VisitorLog } from "@/lib/visitor-store";

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageFilter, setPageFilter] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem("anil_admin_token");
    if (saved) {
      setToken(saved);
    }
  }, []);

  const fetchLogs = useCallback(
    async (adminToken: string) => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/visitors", {
          headers: { "x-admin-key": adminToken },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setToken(null);
            localStorage.removeItem("anil_admin_token");
            setError("Session expired or unauthorized. Please sign in again.");
          }
          return;
        }

        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          setStats(data.stats || null);
        }
      } catch (err) {
        console.error("Failed to fetch visitor logs", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    fetchLogs(token);

    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(token);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, autoRefresh, fetchLogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the admin passcode");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        localStorage.setItem("anil_admin_token", data.token);
        setPasscode("");
        fetchLogs(data.token);
      } else {
        setError(data.error || "Incorrect passcode");
      }
    } catch {
      setError("Network error. Could not authenticate.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("anil_admin_token");
    setLogs([]);
    setStats(null);
  };

  const handleClearLogs = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to clear all visitor logs?")) return;

    try {
      const res = await fetch("/api/admin/visitors", {
        method: "DELETE",
        headers: { "x-admin-key": token },
      });
      if (res.ok) {
        setLogs([]);
        setStats(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = [
      "Timestamp",
      "Date",
      "IP",
      "Country",
      "City",
      "Region",
      "Page",
      "Device",
      "OS",
      "Browser",
      "Screen",
      "Timezone",
      "Referrer",
    ];

    const rows = logs.map((l) => [
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      `"${l.ip}"`,
      `"${l.country}"`,
      `"${l.city}"`,
      `"${l.region}"`,
      `"${l.page}"`,
      `"${l.device}"`,
      `"${l.os}"`,
      `"${l.browser}"`,
      `"${l.screenSize || ""}"`,
      `"${l.timezone || ""}"`,
      `"${l.referrer || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `anil6_visitors_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (pageFilter !== "ALL" && log.page !== pageFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        log.ip.toLowerCase().includes(q) ||
        log.country.toLowerCase().includes(q) ||
        log.city.toLowerCase().includes(q) ||
        log.page.toLowerCase().includes(q) ||
        log.browser.toLowerCase().includes(q) ||
        log.os.toLowerCase().includes(q) ||
        log.device.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, pageFilter]);

  const uniquePages = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.page))).filter(Boolean);
  }, [logs]);

  // LOGIN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4 selection:bg-orange-500/30">
        <div className="w-full max-w-md bg-[#1a1a1e] border border-[#2e2e34] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full blur-[1px]" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 border border-orange-400/50 text-white font-black text-lg tracking-wider mb-4 shadow-lg shadow-orange-600/20">
              AM
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Anil<span className="text-orange-500 font-extrabold">6</span> Visitor Analytics
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Enter your passcode to access real-time visitor details
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (default: anil123)"
                  autoFocus
                  className="w-full rounded-xl bg-[#242429] border border-[#363640] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-800/50 p-2.5 text-xs text-red-300 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold py-3 text-sm shadow-md shadow-orange-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Unlock Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#26262c] text-center">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-1"
            >
              <span>Back to Notepad</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD SCREEN
  return (
    <div className="min-h-screen bg-[#121214] text-gray-200 flex flex-col selection:bg-orange-500/30">
      {/* Top Navbar */}
      <header className="h-14 bg-[#18181c] border-b border-[#2a2a32] px-4 sm:px-8 flex items-center justify-between select-none shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 border border-orange-400/60 text-white font-black text-sm tracking-wider select-none shadow-sm">
              AM
            </div>
            <span className="font-bold tracking-tight text-base text-white">
              Anil<span className="text-orange-500 font-extrabold">6</span>
            </span>
          </Link>

          <div className="h-4 w-px bg-gray-700" />

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Visitor Admin</span>
          </div>

          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="text-[11px] text-gray-400">
              {autoRefresh ? "Live tracking active" : "Paused"}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-colors cursor-pointer ${
              autoRefresh
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                : "bg-[#242429] border-[#363640] text-gray-400"
            }`}
            title="Toggle 5-second auto refresh"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${autoRefresh && isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {autoRefresh ? "Auto (5s)" : "Paused"}
            </span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => token && fetchLogs(token)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-[#242429] border border-[#363640] hover:bg-[#2c2c33] text-gray-300 transition-colors cursor-pointer"
            title="Refresh now"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242429] border border-[#363640] hover:bg-[#2c2c33] text-xs text-gray-200 font-medium transition-colors cursor-pointer disabled:opacity-40"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-gray-400" />
            <span className="hidden md:inline">Export CSV</span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            disabled={!logs.length}
            className="p-1.5 rounded-lg bg-[#242429] border border-[#363640] hover:bg-red-950/40 hover:border-red-800/50 hover:text-red-400 text-gray-400 transition-colors cursor-pointer disabled:opacity-40"
            title="Clear visitor logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-red-900/40 hover:bg-red-950/60 text-xs text-red-300 font-medium transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Visits */}
          <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl p-4.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Total Visits</span>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats?.totalVisits ?? logs.length}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Recorded page sessions</p>
          </div>

          {/* Card 2: Unique Visitors */}
          <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl p-4.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Unique IPs</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats?.uniqueIPs ?? new Set(logs.map((l) => l.ip)).size}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Distinct IP addresses</p>
          </div>

          {/* Card 3: Top Country */}
          <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl p-4.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Top Locations</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight truncate">
              {stats?.countries
                ? Object.keys(stats.countries)[0] || "Global"
                : "Global"}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              {stats?.countries
                ? `${Object.keys(stats.countries).length} countries active`
                : "Locations detected"}
            </p>
          </div>

          {/* Card 4: Device Split */}
          <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl p-4.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Top Device</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Monitor className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats?.devices?.Desktop >= (stats?.devices?.Mobile || 0)
                ? "Desktop"
                : "Mobile"}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              🖥️ {stats?.devices?.Desktop || 0} &nbsp;|&nbsp; 📱 {stats?.devices?.Mobile || 0}
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, country, city, room, OS, or browser..."
              className="w-full rounded-lg bg-[#222228] border border-[#34343e] pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-500 ml-1" />
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="rounded-lg bg-[#222228] border border-[#34343e] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="ALL">All Rooms ({logs.length})</option>
              {uniquePages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visitor Log Table */}
        <div className="bg-[#18181c] border border-[#2a2a32] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#2a2a32] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-white">Live Visitor Log</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">
                {filteredLogs.length} shown
              </span>
            </div>
            {filteredLogs.length > 0 && (
              <span className="text-[11px] text-gray-500">
                Latest: {formatTimeAgo(filteredLogs[0].timestamp)}
              </span>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-[#242429] flex items-center justify-center mx-auto mb-3 text-gray-500">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-300">No visitors found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                {searchQuery || pageFilter !== "ALL"
                  ? "Try adjusting your search or filters to see more results."
                  : "Visitor activity will automatically appear here in real time as people open your website."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e1e24] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#2a2a32] text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Room / Page</th>
                    <th className="px-4 py-3">Device & OS</th>
                    <th className="px-4 py-3">Browser</th>
                    <th className="px-4 py-3">Screen / TZ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262e]">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-[#22222a] transition-colors group"
                    >
                      {/* Time */}
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                        <div
                          className="flex items-center gap-1.5"
                          title={new Date(log.timestamp).toLocaleString()}
                        >
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span>{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3 font-mono font-medium text-gray-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{log.ip}</span>
                          <button
                            onClick={() => handleCopyIp(log.ip)}
                            className="p-1 rounded hover:bg-[#303038] text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Copy IP"
                          >
                            {copiedIp === log.ip ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span className="font-medium text-white">
                            {log.city !== "Unknown" ? `${log.city}, ` : ""}
                            {log.country}
                          </span>
                          {log.region && log.region !== "Unknown" && (
                            <span className="text-[10px] text-gray-500">
                              ({log.region})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visited Page / Room */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {log.page}
                        </span>
                      </td>

                      {/* Device & OS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          {log.device === "Mobile" ? (
                            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                          ) : log.device === "Tablet" ? (
                            <Tablet className="h-3.5 w-3.5 text-purple-400" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 text-gray-400" />
                          )}
                          <span>
                            {log.os} • <span className="text-gray-400">{log.device}</span>
                          </span>
                        </div>
                      </td>

                      {/* Browser */}
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {log.browser}
                      </td>

                      {/* Screen Size & Timezone */}
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[11px]">
                        <div>
                          {log.screenSize || "—"}
                          {log.timezone && (
                            <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                              {log.timezone}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
