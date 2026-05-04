import { NextRequest } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
      return jsonError("세션을 찾을 수 없습니다.", 404, { code: "SESSION_NOT_FOUND" });
    }
    const eligible = snapshot.participants.length;
    const countByRotation = (rotationIndex: 0 | 1) =>
      new Set(
        (snapshot.tableImpressionPicks ?? [])
          .filter((pick) => pick.sessionId === sessionId && pick.rotationIndex === rotationIndex)
          .map((pick) => pick.pickerParticipantId)
      ).size;
    return jsonOk({
      status: "OK" as const,
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
    console.error("[api/admin/table-picks GET]", error);
    const message = error instanceof Error ? error.message : "테이블 픽 요약 조회에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_TABLE_PICKS_SUMMARY_FAILED" });
  }
}
