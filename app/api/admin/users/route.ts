import { NextRequest } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { getAdminUserStore } from "@/lib/admin-user-store";
import type { AdminUserCreateInput } from "@/types/mingle";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["HQ_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const store = getAdminUserStore();
    if (!store) {
      return jsonError("Admin user store is not configured.", 503, { code: "ADMIN_STORE_NOT_CONFIGURED" });
    }

    const users = await store.listAdminUsers();
    return jsonOk({ users });
  } catch (error) {
    console.error("[api/admin/users GET]", error);
    const message =
      error instanceof Error ? error.message : "Failed to load admin users.";
    return jsonError(message, 400, { code: "ADMIN_USERS_LIST_FAILED" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["HQ_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const store = getAdminUserStore();
    if (!store) {
      return jsonError("Admin user store is not configured.", 503, { code: "ADMIN_STORE_NOT_CONFIGURED" });
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const input = (await request.json()) as AdminUserCreateInput;
    if (input.role !== "HQ_ADMIN" && input.branchId) {
      const branch = await db.repository.getBranch(input.branchId);
      if (!branch || !branch.is_active) {
        return jsonError("Select an active branch for this admin user.", 400, {
          code: "ADMIN_USER_BRANCH_INVALID"
        });
      }
    }

    const user = await store.createAdminUser(input, auth.adminSession.adminUserId);
    return jsonOk({ user });
  } catch (error) {
    console.error("[api/admin/users POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to create admin user.";
    return jsonError(message, 400, { code: "ADMIN_USER_CREATE_FAILED" });
  }
}
