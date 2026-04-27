import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ sessions: [] });
}

export async function POST(request: NextRequest) {
  const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
  if ("response" in auth) return auth.response;
  const body = (await request.json()) as Record<string, unknown>;
  return NextResponse.json({
    session: {
      id: `session_${Date.now()}`,
      branchId: String(body.branchId ?? auth.adminSession.branchId ?? ""),
      title: String(body.title ?? "새 세션"),
      status: "WAITING"
    }
  });
}
