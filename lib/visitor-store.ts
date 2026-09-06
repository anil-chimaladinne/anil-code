export interface VisitorLog {
  id: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  browser: string;
  os: string;
  device: "Mobile" | "Tablet" | "Desktop" | "Unknown";
  page: string;
  referrer: string;
  screenSize?: string;
  language?: string;
  timezone?: string;
  timestamp: number;
}

// Global in-memory storage across API invocations
declare global {
  // eslint-disable-next-line no-var
  var __VISITOR_LOGS__: VisitorLog[] | undefined;
}

const MAX_LOGS = 500;

export function getVisitorLogs(): VisitorLog[] {
  if (!global.__VISITOR_LOGS__) {
    global.__VISITOR_LOGS__ = [];
  }
  return global.__VISITOR_LOGS__;
}

export function addVisitorLog(log: Omit<VisitorLog, "id" | "timestamp">): VisitorLog {
  const logs = getVisitorLogs();

  const newLog: VisitorLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
  };

  // Prevent duplicate spam within 10 seconds from same IP and path
  const isRecentDuplicate = logs.some(
    (l) =>
      l.ip === newLog.ip &&
      l.page === newLog.page &&
      newLog.timestamp - l.timestamp < 10000
  );

  if (!isRecentDuplicate) {
    logs.unshift(newLog);
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }
  }

  return newLog;
}

export function clearVisitorLogs(): void {
  global.__VISITOR_LOGS__ = [];
}

export function getVisitorStats(logs: VisitorLog[]) {
  const uniqueIPs = new Set(logs.map((l) => l.ip)).size;
  const totalVisits = logs.length;

  const countries: Record<string, number> = {};
  const devices: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
  const browsers: Record<string, number> = {};
  const pages: Record<string, number> = {};

  for (const log of logs) {
    // Countries
    const country = log.country || "Unknown";
    countries[country] = (countries[country] || 0) + 1;

    // Devices
    devices[log.device] = (devices[log.device] || 0) + 1;

    // Browsers
    browsers[log.browser] = (browsers[log.browser] || 0) + 1;

    // Pages
    pages[log.page] = (pages[log.page] || 0) + 1;
  }

  return {
    totalVisits,
    uniqueIPs,
    countries,
    devices,
    browsers,
    pages,
  };
}
