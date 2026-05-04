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

    const participantsById = new Map(snapshot.participants.map((participant) => [participant.id, participant]));
    const messages = snapshot.anonymousMessages
      .filter((message) => message.sessionId === sessionId)
      .map((message) => {
        const sender = participantsById.get(message.senderParticipantId);
        const receiver = message.receiverParticipantId
          ? participantsById.get(message.receiverParticipantId)
          : null;
        return {
          ...message,
          senderLabel: message.revealSender ? (sender?.nickname ?? "알 수 없음") : "익명",
          receiverLabel: receiver?.nickname ?? null
        };
      });

    return jsonOk({ items: messages });
  } catch (error) {
    console.error("[api/admin/anonymous-messages]", error);
    const message = error instanceof Error ? error.message : "익명 메시지 목록을 조회하지 못했습니다.";
    return jsonError(message, 400, { code: "ADMIN_ANONYMOUS_MESSAGES_LIST_FAILED" });
  }
}
