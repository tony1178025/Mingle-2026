import { NextRequest, NextResponse } from "next/server";
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
    const response = NextResponse.json({
      status: "OK",
      participantId: result.payload.participantId,
      snapshot: result.payload.snapshot
    });
    attachOnboardingSessionCookie(response, result.customerSession);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "입장 처리에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
