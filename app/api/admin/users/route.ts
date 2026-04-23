import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
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
      return new NextResponse("Admin user store is not configured.", { status: 503 });
    }

    const users = await store.listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load admin users.";
    return new NextResponse(message, { status: 400 });
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
      return new NextResponse("Admin user store is not configured.", { status: 503 });
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const input = (await request.json()) as AdminUserCreateInput;
    if (input.role !== "HQ_ADMIN" && input.branchId) {
      const branch = await db.repository.getBranch(input.branchId);
      if (!branch || !branch.is_active) {
        return new NextResponse("Select an active branch for this admin user.", {
          status: 400
        });
      }
    }

    const user = await store.createAdminUser(input, auth.adminSession.adminUserId);
    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create admin user.";
    return new NextResponse(message, { status: 400 });
  }
}
