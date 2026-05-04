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
    if (snapshot.session.id === sessionId) {
      await executeServerCommand({
        type: "admin.setSessionState",
        state: "ROUND_2",
        expectedVersion: snapshot.version
      });
    }

    const session = await db.repository.updateManagedSession(sessionId, {
      status: "OPEN",
      updatedBy: auth.adminSession.adminUserId
    });
    return jsonOk({ session });
  } catch (error) {
    console.error("[api/admin/sessions/round-2]", error);
    const message = error instanceof Error ? error.message : "ROUND_2 전환에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_SESSION_ROUND2_FAILED" });
  }
}
