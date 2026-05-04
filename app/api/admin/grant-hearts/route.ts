import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  canAccessAdminBranch,
  hasRequiredAdminRole,
  readAdminSessionFromRequest
} from "@/lib/admin-auth";
import {
  getServerSessionSnapshot,
  grantHeartsByAdmin,
  sanitizeSnapshotForAdmin
} from "@/lib/repositories/server-repository";
import type { GrantHeartsRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const adminSession = readAdminSessionFromRequest(request);
  if (!adminSession) {
    return jsonError("관리자 인증이 필요합니다.", 401, { code: "ADMIN_AUTH_REQUIRED" });
  }

  if (!hasRequiredAdminRole(adminSession, ["STAFF"])) {
    return jsonError("현재 관리자 역할로는 하트를 지급할 수 없습니다.", 403, {
      code: "ADMIN_ROLE_FORBIDDEN"
    });
  }

  const snapshot = await getServerSessionSnapshot();
  if (!canAccessAdminBranch(adminSession, snapshot.session.branchId)) {
    return jsonError("현재 브랜치 세션에 접근할 권한이 없습니다.", 403, {
      code: "ADMIN_BRANCH_FORBIDDEN"
    });
  }

  try {
    const body = (await request.json()) as GrantHeartsRequest;
    const result = await grantHeartsByAdmin(body.participantId, body.heartsToAdd);
    return jsonOk({
      ...result,
      snapshot: sanitizeSnapshotForAdmin(result.snapshot)
    });
  } catch (error) {
    console.error("[api/admin/grant-hearts]", error);
    const message = error instanceof Error ? error.message : "하트 지급에 실패했습니다.";
    return jsonError(message, 400, { code: "GRANT_HEARTS_FAILED" });
  }
}
