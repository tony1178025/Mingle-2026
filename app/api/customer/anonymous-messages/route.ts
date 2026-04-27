import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "메시지 전송에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
