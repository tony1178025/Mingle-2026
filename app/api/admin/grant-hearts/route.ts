import { NextRequest, NextResponse } from "next/server";
import {
  canAccessAdminBranch,
  hasRequiredAdminRole,
  readAdminSessionFromRequest
} from "@/lib/admin-auth";
import { getServerSessionSnapshot, grantHeartsByAdmin } from "@/lib/repositories/server-repository";
import type { GrantHeartsRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const adminSession = readAdminSessionFromRequest(request);
  if (!adminSession) {
    return new NextResponse("관리자 인증이 필요합니다.", { status: 401 });
  }

  if (!hasRequiredAdminRole(adminSession, ["STAFF"])) {
    return new NextResponse("현재 관리자 역할로는 하트를 지급할 수 없습니다.", {
      status: 403
    });
  }

  const snapshot = await getServerSessionSnapshot();
  if (!canAccessAdminBranch(adminSession, snapshot.session.branchId)) {
    return new NextResponse("현재 브랜치 세션에 접근할 권한이 없습니다.", { status: 403 });
  }

  try {
    const body = (await request.json()) as GrantHeartsRequest;
    const result = await grantHeartsByAdmin(body.participantId, body.heartsToAdd);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "하트 지급에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
