import { NextRequest, NextResponse } from "next/server";
import {
  canAccessAdminBranch,
  hasRequiredAdminRole,
  readAdminSessionFromRequest
} from "@/lib/admin-auth";
import { getDbAuthorityRepository } from "@/lib/repositories/authority-backend";
import type { AdminRole, AdminSessionRecord } from "@/types/mingle";

export function requireAdminRole(
  request: NextRequest,
  requiredRoles: readonly AdminRole[]
): { adminSession: AdminSessionRecord } | { response: NextResponse } {
  const adminSession = readAdminSessionFromRequest(request);
  if (!adminSession) {
    return {
      response: new NextResponse("관리자 인증이 필요합니다.", { status: 401 })
    };
  }

  if (!hasRequiredAdminRole(adminSession, requiredRoles)) {
    return {
      response: new NextResponse("현재 관리자 권한으로는 이 작업을 수행할 수 없습니다.", {
        status: 403
      })
    };
  }

  return { adminSession };
}

export function requireBranchScope(
  adminSession: AdminSessionRecord,
  branchId: string | null
): NextResponse | null {
  if (!canAccessAdminBranch(adminSession, branchId)) {
    return new NextResponse("현재 브랜치 범위에서는 이 작업을 수행할 수 없습니다.", {
      status: 403
    });
  }

  return null;
}

export function requireDbRepository() {
  const repository = getDbAuthorityRepository();
  if (!repository) {
    return {
      response: new NextResponse("DB authority repository가 아직 준비되지 않았습니다.", {
        status: 503
      })
    };
  }

  return { repository };
}
