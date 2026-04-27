import type { NextRequest } from "next/server";
import { submitCustomerMatchConsent } from "@/lib/services/customer-session-service";

export async function handleCustomerMatchConsent(
  request: NextRequest,
  payload: {
    targetParticipantId: string;
    consent: boolean;
    methods?: {
      realName?: string;
      phone?: string;
      kakaoId?: string;
      instagramId?: string;
    };
  }
) {
  return submitCustomerMatchConsent(
    request,
    payload.targetParticipantId,
    payload.consent,
    payload.methods
  );
}
