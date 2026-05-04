import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { sendCustomerHeart } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { recipientId: string };
    const result = await sendCustomerHeart(request, body.recipientId);
    return jsonOk(result);
  } catch (error) {
    console.error("[api/customer/heart]", error);
    const message = error instanceof Error ? error.message : "하트 전송에 실패했습니다.";
    return jsonError(message, 400, { code: "CUSTOMER_HEART_FAILED" });
  }
}
