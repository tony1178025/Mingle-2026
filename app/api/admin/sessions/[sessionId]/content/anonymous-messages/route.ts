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

    return NextResponse.json({ items: messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "익명 메시지 목록을 조회하지 못했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
