import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireBranchScope, requireDbRepository } from "@/app/api/admin/helpers";
import { executeServerCommand, getServerSessionSnapshot } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }
    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }
    const { sessionId } = await context.params;
    const current = await db.repository.getSessionRow(sessionId);
    if (!current) {
      return new NextResponse("Session not found.", { status: 404 });
    }
    const scopeError = requireBranchScope(auth.adminSession, current.branch_id);
    if (scopeError) {
      return scopeError;
    }

    const snapshot = await getServerSessionSnapshot();
    if (snapshot.session.id === sessionId && snapshot.session.phase !== "CLOSED") {
      try {
        await executeServerCommand({
          type: "admin.setSessionState",
          state: "CLOSED",
          expectedVersion: snapshot.version
        });
      } catch {
        // Keep lifecycle close operable even when runtime phase transition is unavailable.
      }
    }

    const session = await db.repository.updateManagedSession(sessionId, {
      status: "CLOSED",
      updatedBy: auth.adminSession.adminUserId
    });
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "세션 종료에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
