import { NextRequest } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { getAdminUserStore } from "@/lib/admin-user-store";
import type { AdminUserUpdateInput } from "@/types/mingle";

export const runtime = "nodejs";

type UpdateUserBody =
  | {
      type: "update";
      input: AdminUserUpdateInput;
    }
  | {
      type: "reset-password";
      password: string;
    };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ adminUserId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["HQ_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const store = getAdminUserStore();
    if (!store) {
      return jsonError("Admin user store is not configured.", 503, { code: "ADMIN_STORE_NOT_CONFIGURED" });
    }

    const { adminUserId } = await context.params;
    const body = (await request.json()) as UpdateUserBody;

    if (body.type === "reset-password") {
      const password = body.password?.trim();
      if (!password || password.length < 8) {
        return jsonError("Password must be at least 8 characters long.", 400, {
          code: "ADMIN_PASSWORD_TOO_SHORT"
        });
      }

      const user = await store.resetAdminUserPassword(
        adminUserId,
        password,
        auth.adminSession.adminUserId
      );
      return jsonOk({ user });
    }

    if (body.type !== "update") {
      return jsonError("Unsupported admin user action.", 400, { code: "ADMIN_USER_ACTION_UNSUPPORTED" });
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    if (body.input.role !== "HQ_ADMIN" && body.input.branchId) {
      const branch = await db.repository.getBranch(body.input.branchId);
      if (!branch || !branch.is_active) {
        return jsonError("Select an active branch for this admin user.", 400, {
          code: "ADMIN_USER_BRANCH_INVALID"
        });
      }
    }

    const user = await store.updateAdminUser(
      adminUserId,
      body.input,
      auth.adminSession.adminUserId
    );
    return jsonOk({ user });
  } catch (error) {
    console.error("[api/admin/users PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update admin user.";
    return jsonError(message, 400, { code: "ADMIN_USER_UPDATE_FAILED" });
  }
}
