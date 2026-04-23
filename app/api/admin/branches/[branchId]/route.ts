import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, requireDbRepository } from "@/app/api/admin/helpers";
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
      return new NextResponse("Branch not found.", { status: 404 });
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

    return NextResponse.json({ branch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update branch.";
    return new NextResponse(message, { status: 400 });
  }
}
