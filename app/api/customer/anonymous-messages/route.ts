import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { submitAnonymousMessage } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      contentBlockId: string;
      senderParticipantId?: string;
      receiverParticipantId?: string | null;
      receiverHint?: string | null;
      message: string;
      revealSender?: boolean;
    };
    const result = await submitAnonymousMessage(request, body);
    return jsonOk(result);
  } catch (error) {
    console.error("[api/customer/anonymous-messages]", error);
    const message = error instanceof Error ? error.message : "메시지 전송에 실패했습니다.";
    return jsonError(message, 400, { code: "ANONYMOUS_MESSAGE_FAILED" });
  }
}
