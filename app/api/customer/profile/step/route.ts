import { NextRequest, NextResponse } from "next/server";
import { saveOnboardingStep } from "@/lib/services/customer-onboarding-service";
import type { CustomerProfileStepRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CustomerProfileStepRequest;
    const result = saveOnboardingStep(payload);
    return NextResponse.json({
      status: "OK",
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "프로필 임시 저장에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
