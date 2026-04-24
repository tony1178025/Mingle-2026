import { NextRequest, NextResponse } from "next/server";
import {
  clearCustomerSession,
  isCustomerSessionCompatibleWithSnapshot,
  readCustomerSession,
  resolveCustomerSessionParticipantId,
  validateCustomerSessionAgainstDbAuthority
} from "@/lib/customer-session";
import { getServerSessionSnapshot, sanitizeSnapshotForClient } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getServerSessionSnapshot();
    const customerSession = readCustomerSession(request);
    const authorityValidation = customerSession
      ? await validateCustomerSessionAgainstDbAuthority(customerSession)
      : { valid: true as const };
    const currentParticipantId = authorityValidation.valid
      ? resolveCustomerSessionParticipantId(snapshot, customerSession)
      : null;
    const response = NextResponse.json({ data: sanitizeSnapshotForClient(snapshot), currentParticipantId });

    if (
      customerSession &&
      (!authorityValidation.valid ||
        !isCustomerSessionCompatibleWithSnapshot(snapshot, customerSession))
    ) {
      clearCustomerSession(response);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "세션 스냅샷을 불러오지 못했습니다.";
    return NextResponse.json(
      {
        error: message,
        code: "SESSION_SNAPSHOT_LOAD_FAILED"
      },
      { status: 500 }
    );
  }
}
