import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
    return jsonOk(result);
  } catch (error) {
    console.error("[api/customer/match]", error);
    const message = error instanceof Error ? error.message : "연락처 동의 처리에 실패했습니다.";
    return jsonError(message, 400, { code: "CUSTOMER_MATCH_CONSENT_FAILED" });
  }
}
