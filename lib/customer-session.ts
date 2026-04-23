import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  logInvalidSessionAttempt,
  logSessionRevocation
} from "@/lib/authority-monitoring";
import { MINGLE_CONSTANTS } from "@/lib/mingle";
import { getDbAuthorityRepository } from "@/lib/repositories/authority-backend";
import type { CustomerSessionRecord, SessionSnapshot } from "@/types/mingle";

export const CUSTOMER_SESSION_COOKIE_NAME = "mingle_customer_session";

function getCustomerSessionSecret() {
  const secret = process.env.MINGLE_CUSTOMER_SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "mingle-customer-session-dev-only";
  }

  throw new Error("MINGLE_CUSTOMER_SESSION_SECRET이 설정되지 않았습니다.");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getCustomerSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function serializeCustomerSession(session: CustomerSessionRecord) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseCustomerSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as CustomerSessionRecord;
    if (
      !parsed.participantId ||
      !parsed.reservationId ||
      !parsed.sessionId ||
      typeof parsed.sessionVersion !== "number" ||
      !parsed.issuedAt ||
      !parsed.expiresAt
    ) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  };
}

export function buildCustomerSession(input: {
  participantId: string;
  reservationId: string;
  sessionId: string;
  sessionVersion: number;
}) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + MINGLE_CONSTANTS.sessionExpiryHours * 60 * 60 * 1000
  ).toISOString();

  return {
    participantId: input.participantId,
    reservationId: input.reservationId,
    sessionId: input.sessionId,
    sessionVersion: input.sessionVersion,
    issuedAt,
    expiresAt
  } satisfies CustomerSessionRecord;
}

export function issueCustomerSession(
  response: NextResponse,
  session: CustomerSessionRecord
) {
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE_NAME,
    serializeCustomerSession(session),
    buildCookieOptions(session.expiresAt)
  );
}

export function clearCustomerSession(response: NextResponse) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function readCustomerSession(request: NextRequest) {
  return parseCustomerSession(request.cookies.get(CUSTOMER_SESSION_COOKIE_NAME)?.value);
}

export function validateCustomerSession(
  request: NextRequest,
  expected: Partial<
    Pick<CustomerSessionRecord, "participantId" | "reservationId" | "sessionId" | "sessionVersion">
  > = {}
) {
  const session = readCustomerSession(request);
  if (!session) {
    return null;
  }

  if (expected.participantId && session.participantId !== expected.participantId) {
    return null;
  }

  if (expected.reservationId && session.reservationId !== expected.reservationId) {
    return null;
  }

  if (expected.sessionId && session.sessionId !== expected.sessionId) {
    return null;
  }

  if (
    typeof expected.sessionVersion === "number" &&
    session.sessionVersion !== expected.sessionVersion
  ) {
    return null;
  }

  return session;
}

export function isCustomerSessionCompatibleWithSnapshot(
  snapshot: SessionSnapshot,
  session: CustomerSessionRecord | null
) {
  if (!session) {
    return false;
  }

  return (
    snapshot.session.id === session.sessionId &&
    snapshot.session.customerSessionVersion === session.sessionVersion
  );
}

export function resolveCustomerSessionParticipantId(
  snapshot: SessionSnapshot,
  session: CustomerSessionRecord | null
) {
  if (!isCustomerSessionCompatibleWithSnapshot(snapshot, session)) {
    return null;
  }

  if (!session) {
    return null;
  }

  const participant = snapshot.participants.find((item) => item.id === session.participantId);
  if (!participant) {
    return null;
  }

  if (participant.reservationId !== session.reservationId) {
    return null;
  }

  return participant.id;
}

export async function validateCustomerSessionAgainstDbAuthority(
  session: CustomerSessionRecord | null
) {
  if (!session) {
    return {
      valid: false,
      reason: "missing-session" as const
    };
  }

  const dbAuthority = getDbAuthorityRepository();
  if (!dbAuthority) {
    return {
      valid: true,
      reason: null
    };
  }

  const dbSnapshot = await dbAuthority.getExistingSessionSnapshot({ fresh: true });
  if (!dbSnapshot || dbSnapshot.session.id !== session.sessionId) {
    logInvalidSessionAttempt({
      actor: "customer",
      participantId: session.participantId,
      reservationId: session.reservationId,
      sessionId: session.sessionId,
      reason: "db-session-missing"
    });
    return {
      valid: false,
      reason: "db-session-missing" as const
    };
  }

  if (dbSnapshot.session.customerSessionVersion !== session.sessionVersion) {
    logSessionRevocation({
      participantId: session.participantId,
      reservationId: session.reservationId,
      sessionId: session.sessionId,
      cookieSessionVersion: session.sessionVersion,
      authoritySessionVersion: dbSnapshot.session.customerSessionVersion
    });
    return {
      valid: false,
      reason: "session-version-mismatch" as const
    };
  }

  return {
    valid: true,
    reason: null,
    snapshot: dbSnapshot
  };
}
