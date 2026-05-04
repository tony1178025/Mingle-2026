import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { saveOnboardingStep } from "@/lib/services/customer-onboarding-service";
import type { CustomerProfileStepRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw.trim()) {
      return jsonError("요청 본문이 비어 있습니다.", 400, { code: "EMPTY_BODY" });
    }
    let payload: CustomerProfileStepRequest;
    try {
      payload = JSON.parse(raw) as CustomerProfileStepRequest;
    } catch {
      return jsonError("JSON 형식이 올바르지 않습니다.", 400, { code: "INVALID_JSON" });
    }
    const result = saveOnboardingStep(payload);
    return jsonOk({
      status: "OK" as const,
      ...result
    });
  } catch (error) {
    console.error("[api/customer/profile/step]", error);
    const message = error instanceof Error ? error.message : "프로필 임시 저장에 실패했습니다.";
    return jsonError(message, 400, { code: "PROFILE_STEP_SAVE_FAILED" });
  }
}
