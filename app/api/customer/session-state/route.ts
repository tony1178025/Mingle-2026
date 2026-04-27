import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionState } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const result = await getCustomerSessionState(request);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "세션 상태 조회에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
