import { NextRequest, NextResponse } from "next/server";
import {
  clearCustomerSession,
  isCustomerSessionCompatibleWithSnapshot,
  readCustomerSession,
  resolveCustomerSessionParticipantId,
  validateCustomerSessionAgainstDbAuthority
} from "@/lib/customer-session";
import { getServerSessionSnapshot } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const snapshot = await getServerSessionSnapshot();
  const customerSession = readCustomerSession(request);
  const authorityValidation = customerSession
    ? await validateCustomerSessionAgainstDbAuthority(customerSession)
    : { valid: true as const };
  const currentParticipantId = authorityValidation.valid
    ? resolveCustomerSessionParticipantId(snapshot, customerSession)
    : null;
  const response = NextResponse.json({ data: snapshot, currentParticipantId });

  if (
    customerSession &&
    (!authorityValidation.valid ||
      !isCustomerSessionCompatibleWithSnapshot(snapshot, customerSession))
  ) {
    clearCustomerSession(response);
  }

  return response;
}
