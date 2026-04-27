import { NextRequest, NextResponse } from "next/server";
import { handleCustomerMatchConsent } from "@/lib/services/match-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      targetParticipantId: string;
      consent: boolean;
      methods?: {
        realName?: string;
        phone?: string;
        kakaoId?: string;
        instagramId?: string;
      };
    };
    const result = await handleCustomerMatchConsent(request, payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "연락처 동의 처리에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
