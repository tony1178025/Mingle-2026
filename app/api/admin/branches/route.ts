import { NextRequest } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import type { BranchUpsertInput } from "@/types/mingle";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const branches = await db.repository.listBranches();
    const visibleBranches =
      auth.adminSession.role === "HQ_ADMIN"
        ? branches
        : branches.filter((branch) => branch.id === auth.adminSession.branchId);
    return jsonOk({ branches: visibleBranches });
  } catch (error) {
    console.error("[api/admin/branches GET]", error);
    const message =
      error instanceof Error ? error.message : "Failed to load branches.";
    return jsonError(message, 400, { code: "ADMIN_BRANCHES_LIST_FAILED" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["HQ_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const input = (await request.json()) as BranchUpsertInput;
    const branch = await db.repository.saveBranch({
      ...input,
      updatedBy: auth.adminSession.adminUserId
    });
    return jsonOk({ branch });
  } catch (error) {
    console.error("[api/admin/branches POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to create branch.";
    return jsonError(message, 400, { code: "ADMIN_BRANCH_CREATE_FAILED" });
  }
}
