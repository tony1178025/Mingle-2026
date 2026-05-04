import { NextRequest } from "next/server";
import { requireAdminRole, requireBranchScope, requireDbRepository } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
      return jsonError("Session not found.", 404, { code: "SESSION_NOT_FOUND" });
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
    return jsonOk({ session });
  } catch (error) {
    console.error("[api/admin/sessions/close]", error);
    const message = error instanceof Error ? error.message : "세션 종료에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_SESSION_CLOSE_FAILED" });
  }
}
