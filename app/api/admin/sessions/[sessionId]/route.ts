import { NextRequest } from "next/server";
import {
  requireAdminRole,
  requireBranchScope,
  requireDbRepository
} from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import type { ManagedSessionUpsertInput } from "@/types/mingle";

export const runtime = "nodejs";

export async function PATCH(
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
    const existing = await db.repository.getSessionRow(sessionId);
    if (!existing) {
      return jsonError("Session not found.", 404, { code: "SESSION_NOT_FOUND" });
    }

    const existingScopeError = requireBranchScope(auth.adminSession, existing.branch_id);
    if (existingScopeError) {
      return existingScopeError;
    }

    const input = (await request.json()) as Partial<ManagedSessionUpsertInput>;
    if (input.branchId) {
      const nextScopeError = requireBranchScope(auth.adminSession, input.branchId);
      if (nextScopeError) {
        return nextScopeError;
      }
    }

    const session = await db.repository.updateManagedSession(sessionId, {
      ...input,
      updatedBy: auth.adminSession.adminUserId
    });
    return jsonOk({ session });
  } catch (error) {
    console.error("[api/admin/sessions PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update session.";
    return jsonError(message, 400, { code: "ADMIN_SESSION_UPDATE_FAILED" });
  }
}
