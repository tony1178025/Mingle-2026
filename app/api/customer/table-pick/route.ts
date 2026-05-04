import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { getServerSessionSnapshot } from "@/lib/repositories/server-repository";
import { submitTablePick } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const participantId = request.nextUrl.searchParams.get("participantId");
    if (!sessionId || !participantId) {
      return jsonError("sessionId와 participantId가 필요합니다.", 400, {
        code: "TABLE_PICK_QUERY_INVALID"
      });
    }
    const snapshot = await getServerSessionSnapshot();
    if (snapshot.session.id !== sessionId) {
      return jsonError("세션을 찾을 수 없습니다.", 404, { code: "SESSION_NOT_FOUND" });
    }
    const participant = snapshot.participants.find((item) => item.id === participantId);
    if (!participant) {
      return jsonError("참가자를 찾을 수 없습니다.", 404, { code: "PARTICIPANT_NOT_FOUND" });
    }
    const openWindow =
      (snapshot.tablePickWindows ?? []).find(
        (window) => window.status === "OPEN" && window.sessionId === sessionId
      ) ??
      null;
    const rotationIndex = openWindow?.rotationIndex ?? null;
    const statusMap = snapshot.participantStatusMap ?? {};
    const candidates =
      rotationIndex === null
        ? []
        : snapshot.participants
            .filter((item) => item.id !== participant.id)
            .filter((item) => item.sessionId === sessionId && item.tableId === participant.tableId)
            .filter((item) => item.gender !== participant.gender)
            .filter((item) => {
              const status = statusMap[item.id] ?? "ACTIVE";
              return status === "ACTIVE" || status === "IDLE";
            })
            .map((item) => ({
              id: item.id,
              nickname: item.nickname,
              age: item.age,
              tableLabel: item.tableLabel
            }));
    const picks = (snapshot.tableImpressionPicks ?? []).filter(
      (pick) =>
        pick.sessionId === sessionId &&
        pick.pickerParticipantId === participantId &&
        pick.rotationIndex === rotationIndex
    );
    return jsonOk({
      status: "OK" as const,
      isOpen: Boolean(openWindow),
      rotationIndex,
      tableLabel: participant.tableLabel,
      candidates,
      myPicks: {
        WANT_TO_KNOW: picks.find((pick) => pick.pickType === "WANT_TO_KNOW")?.targetParticipantId ?? null,
        FUNNY: picks.find((pick) => pick.pickType === "FUNNY")?.targetParticipantId ?? null
      }
    });
  } catch (error) {
    console.error("[api/customer/table-pick GET]", error);
    const message = error instanceof Error ? error.message : "테이블 픽 상태를 조회하지 못했습니다.";
    return jsonError(message, 400, { code: "TABLE_PICK_STATUS_FAILED" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      participantId?: string;
      rotationIndex: 0 | 1;
      wantToKnowParticipantId: string;
      funnyParticipantId: string;
      contentBlockId?: string | null;
    };
    await submitTablePick(request, body);
    return jsonOk({ status: "OK" as const });
  } catch (error) {
    console.error("[api/customer/table-pick POST]", error);
    const message = error instanceof Error ? error.message : "테이블 픽 저장에 실패했습니다.";
    return jsonError(message, 400, { code: "TABLE_PICK_SAVE_FAILED" });
  }
}
