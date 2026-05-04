import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  attachOnboardingSessionCookie,
  finalizeOnboardingEnter
} from "@/lib/services/customer-onboarding-service";
import type { CustomerEnterRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CustomerEnterRequest;
    const result = await finalizeOnboardingEnter(payload);
    const response = jsonOk({
      status: "OK" as const,
      participantId: result.payload.participantId,
      snapshot: result.payload.snapshot
    });
    attachOnboardingSessionCookie(response, result.customerSession);
    return response;
  } catch (error) {
    console.error("[api/customer/enter]", error);
    const message = error instanceof Error ? error.message : "입장 처리에 실패했습니다.";
    return jsonError(message, 400, { code: "CUSTOMER_ENTER_FAILED" });
  }
}
