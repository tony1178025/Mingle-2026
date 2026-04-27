import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminRole,
  requireBranchScope,
  requireDbRepository
} from "@/app/api/admin/helpers";
import type { ManagedSessionUpsertInput } from "@/types/mingle";

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

    const requestedBranchId = request.nextUrl.searchParams.get("branchId");
    const branchScope = auth.adminSession.role === "HQ_ADMIN" ? requestedBranchId : auth.adminSession.branchId;
    const sessions = await db.repository.listManagedSessions(branchScope);
    return NextResponse.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sessions.";
    return new NextResponse(message, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const db = requireDbRepository();
    if ("response" in db) {
      return db.response;
    }

    const input = (await request.json()) as ManagedSessionUpsertInput;
    const scopeError = requireBranchScope(auth.adminSession, input.branchId);
    if (scopeError) {
      return scopeError;
    }

    const session = await db.repository.createManagedSession({
      ...input,
      updatedBy: auth.adminSession.adminUserId
    });
    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session.";
    return new NextResponse(message, { status: 400 });
  }
}
