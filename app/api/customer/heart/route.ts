import { NextRequest, NextResponse } from "next/server";
import { sendCustomerHeart } from "@/lib/services/customer-session-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { recipientId: string };
    const result = await sendCustomerHeart(request, body.recipientId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "하트 전송에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
