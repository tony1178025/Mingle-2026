import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
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
    return NextResponse.json({ branches: visibleBranches });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load branches.";
    return new NextResponse(message, { status: 400 });
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
    return NextResponse.json({ branch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create branch.";
    return new NextResponse(message, { status: 400 });
  }
}
