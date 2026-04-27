import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { getServerSessionSnapshot } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["STAFF"]);
    if ("response" in auth) {
      return auth.response;
    }
    const { sessionId } = await context.params;
    const snapshot = await getServerSessionSnapshot();
    if (snapshot.session.id !== sessionId) {
      return new NextResponse("세션을 찾을 수 없습니다.", { status: 404 });
    }
    const eligible = snapshot.participants.length;
    const countByRotation = (rotationIndex: 0 | 1) =>
      new Set(
        (snapshot.tableImpressionPicks ?? [])
          .filter((pick) => pick.sessionId === sessionId && pick.rotationIndex === rotationIndex)
          .map((pick) => pick.pickerParticipantId)
      ).size;
    return NextResponse.json({
      status: "OK",
      summary: {
        rotationIndex0: {
          submittedCount: countByRotation(0),
          totalEligibleCount: eligible
        },
        rotationIndex1: {
          submittedCount: countByRotation(1),
          totalEligibleCount: eligible
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "테이블 픽 요약 조회에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
