import { NextRequest, NextResponse } from "next/server";
import { getVisitorLogs, getVisitorStats, clearVisitorLogs } from "@/lib/visitor-store";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "anil123";

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("x-admin-key") || req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const logs = getVisitorLogs();
  const stats = getVisitorStats(logs);

  return NextResponse.json({
    success: true,
    logs,
    stats,
  });
}

export async function POST(req: NextRequest) {
  // Login / verification endpoint
  try {
    const { passcode } = await req.json();
    if (passcode === ADMIN_SECRET) {
      return NextResponse.json({ success: true, token: ADMIN_SECRET });
    }
    return NextResponse.json({ error: "Invalid admin passcode" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  clearVisitorLogs();
  return NextResponse.json({ success: true, message: "Visitor logs cleared" });
}
