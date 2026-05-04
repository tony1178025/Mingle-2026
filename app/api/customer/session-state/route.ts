import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { getCustomerSessionState } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const result = await getCustomerSessionState(request);
    return jsonOk(result);
  } catch (error) {
    console.error("[api/customer/session-state]", error);
    const message = error instanceof Error ? error.message : "세션 상태 조회에 실패했습니다.";
    return jsonError(message, 400, { code: "CUSTOMER_SESSION_STATE_FAILED" });
  }
}
