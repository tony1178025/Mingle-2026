import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
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
      return new NextResponse("Admin user store is not configured.", { status: 503 });
    }

    const { adminUserId } = await context.params;
    const body = (await request.json()) as UpdateUserBody;

    if (body.type === "reset-password") {
      const password = body.password?.trim();
      if (!password || password.length < 8) {
        return new NextResponse("Password must be at least 8 characters long.", {
          status: 400
        });
      }

      const user = await store.resetAdminUserPassword(
        adminUserId,
        password,
        auth.adminSession.adminUserId
      );
      return NextResponse.json({ user });
    }

    if (body.type !== "update") {
      return new NextResponse("Unsupported admin user action.", { status: 400 });
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    if (body.input.role !== "HQ_ADMIN" && body.input.branchId) {
      const branch = await db.repository.getBranch(body.input.branchId);
      if (!branch || !branch.is_active) {
        return new NextResponse("Select an active branch for this admin user.", {
          status: 400
        });
      }
    }

    const user = await store.updateAdminUser(
      adminUserId,
      body.input,
      auth.adminSession.adminUserId
    );
    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update admin user.";
    return new NextResponse(message, { status: 400 });
  }
}
