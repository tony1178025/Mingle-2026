import { NextRequest, NextResponse } from "next/server";
import {
  canAccessAdminBranch,
  hasRequiredAdminRole,
  readAdminSessionFromRequest
} from "@/lib/admin-auth";
import { jsonError } from "@/lib/api/json-response";
import { getDbAuthorityRepository } from "@/lib/repositories/authority-backend";
import type { AdminRole, AdminSessionRecord } from "@/types/mingle";

export function requireAdminRole(
  request: NextRequest,
  requiredRoles: readonly AdminRole[]
): { adminSession: AdminSessionRecord } | { response: NextResponse } {
  const adminSession = readAdminSessionFromRequest(request);
  if (!adminSession) {
    return {
      response: jsonError("관리자 인증이 필요합니다.", 401, { code: "ADMIN_AUTH_REQUIRED" })
    };
  }

  if (!hasRequiredAdminRole(adminSession, requiredRoles)) {
    return {
      response: jsonError("현재 관리자 권한으로는 이 작업을 수행할 수 없습니다.", 403, {
        code: "ADMIN_ROLE_FORBIDDEN"
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
    return jsonError("현재 브랜치 범위에서는 이 작업을 수행할 수 없습니다.", 403, {
      code: "ADMIN_BRANCH_FORBIDDEN"
    });
  }

  return null;
}

export function requireDbRepository() {
  const repository = getDbAuthorityRepository();
  if (!repository) {
    return {
      response: jsonError("DB authority repository가 아직 준비되지 않았습니다.", 503, {
        code: "DB_REPOSITORY_UNAVAILABLE"
      })
    };
  }

  return { repository };
}
