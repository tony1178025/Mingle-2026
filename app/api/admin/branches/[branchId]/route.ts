import { NextRequest } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import type { BranchUpsertInput } from "@/types/mingle";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ branchId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["HQ_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const { branchId } = await context.params;
    const existing = await db.repository.getBranch(branchId);
    if (!existing) {
      return jsonError("Branch not found.", 404, { code: "BRANCH_NOT_FOUND" });
    }

    const input = (await request.json()) as BranchUpsertInput;
    const branch = await db.repository.saveBranch({
      id: branchId,
      name: input.name,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      defaultMaxCapacity: input.defaultMaxCapacity,
      defaultTableCount: input.defaultTableCount,
      isActive: input.isActive,
      updatedBy: auth.adminSession.adminUserId
    });

    return jsonOk({ branch });
  } catch (error) {
    console.error("[api/admin/branches PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update branch.";
    return jsonError(message, 400, { code: "ADMIN_BRANCH_UPDATE_FAILED" });
  }
}
