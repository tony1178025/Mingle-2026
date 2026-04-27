import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireBranchScope, requireDbRepository } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["STAFF"]);
    if ("response" in auth) {
      return auth.response;
    }
    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const requestedBranchId = request.nextUrl.searchParams.get("branchId");
    const branchId = auth.adminSession.role === "HQ_ADMIN" ? requestedBranchId : auth.adminSession.branchId;
    if (!branchId) {
      return new NextResponse("branchId가 필요합니다.", { status: 400 });
    }
    const scopeError = requireBranchScope(auth.adminSession, branchId);
    if (scopeError) {
      return scopeError;
    }

    const sessions = await db.repository.listManagedSessions(branchId);
    const currentSession =
      sessions.find((session) => session.status === "OPEN" && session.phase !== "CLOSED") ?? null;
    return NextResponse.json({ session: currentSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "현재 세션을 조회하지 못했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
