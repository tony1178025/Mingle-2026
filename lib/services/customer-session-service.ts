import {
  executeServerCommand,
  getServerSessionSnapshot,
  sanitizeSnapshotForCustomer
} from "@/lib/repositories/server-repository";
import { validateCustomerSession } from "@/lib/customer-session";
import type { NextRequest } from "next/server";
import type { SessionCommandResponse } from "@/types/mingle";

function requireParticipantId(request: NextRequest, explicitParticipantId?: string) {
  if (explicitParticipantId) {
    return explicitParticipantId;
  }
  const session = validateCustomerSession(request);
  if (!session) {
    throw new Error("유효한 참가자 세션이 필요합니다.");
  }
  return session.participantId;
}

export async function getCustomerSessionState(request: NextRequest) {
  const snapshot = await getServerSessionSnapshot();
  const session = validateCustomerSession(request, {
    sessionId: snapshot.session.id,
    sessionVersion: snapshot.session.customerSessionVersion
  });
  return {
    snapshot: sanitizeSnapshotForCustomer(snapshot),
    participantId: session?.participantId ?? null
  };
}

export async function sendCustomerHeart(request: NextRequest, recipientId: string) {
  const participantId = requireParticipantId(request);
  const result = await executeServerCommand({
    type: "customer.sendHeart",
    participantId,
    recipientId
  });
  return {
    ...result,
    snapshot: sanitizeSnapshotForCustomer(result.snapshot)
  } satisfies SessionCommandResponse;
}

export async function submitCustomerMatchConsent(
  request: NextRequest,
  targetParticipantId: string,
  consent: boolean,
  methods?: {
    realName?: string;
    phone?: string;
    kakaoId?: string;
    instagramId?: string;
  }
) {
  const participantId = requireParticipantId(request);
  const result = await executeServerCommand({
    type: "customer.submitContactExchangeConsent",
    participantId,
    targetParticipantId,
    consent,
    methods
  });
  return {
    ...result,
    snapshot: sanitizeSnapshotForCustomer(result.snapshot)
  } satisfies SessionCommandResponse;
}
