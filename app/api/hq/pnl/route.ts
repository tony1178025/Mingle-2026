import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { calculateSessionPnL } from "@/lib/services/pnl-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["HQ_ADMIN"]);
  if ("response" in auth) return auth.response;
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "none";
  return NextResponse.json(
    calculateSessionPnL({
      sessionId,
      participantCount: 0
    })
  );
}
