import { NextRequest, NextResponse } from "next/server";
import {
  buildCustomerSession,
  clearCustomerSession,
  issueCustomerSession
} from "@/lib/customer-session";
import { getReservationSessionContext, sanitizeSnapshotForClient } from "@/lib/repositories/server-repository";
import type { ReservationSessionContextRequest } from "@/types/mingle";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReservationSessionContextRequest;
    const result = await getReservationSessionContext(body);
    const response = NextResponse.json({
      ...result,
      snapshot: sanitizeSnapshotForClient(result.snapshot)
    });
    const resolution = result.checkinResolution;

    if (
      resolution &&
      result.participantId &&
      (resolution.flowState === "SUCCESS" || resolution.flowState === "RE_ENTRY")
    ) {
      issueCustomerSession(
        response,
        buildCustomerSession({
          participantId: result.participantId,
          reservationId: resolution.reservationId,
          sessionId: resolution.sessionId,
          sessionVersion: result.snapshot.session.customerSessionVersion
        })
      );
    } else {
      clearCustomerSession(response);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "예약 세션 컨텍스트를 확인하지 못했습니다.";
    const response = new NextResponse(message, { status: 400 });
    clearCustomerSession(response);
    return response;
  }
}
