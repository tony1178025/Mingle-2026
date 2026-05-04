import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { buildCustomerSession, issueCustomerSession } from "@/lib/customer-session";
import type {
  ExternalReservationSessionContext,
  ParticipantRecord,
  SessionSnapshot
} from "@/types/mingle";
import { readRouteResponseData } from "@/tests/helpers/read-route-json";

const originalCwd = process.cwd();
const originalSecret = process.env.MINGLE_CUSTOMER_SESSION_SECRET;
const SESSION_ID = "session_signature_20260412";
const SESSION_COOKIE_NAME = "mingle_customer_session";
const HQ_ID = "hq_mingle";
const BRANCH_ID = "branch_seongsu";
const EVENT_ID = "event_signature_20260412";

function createSnapshot(participants: ParticipantRecord[] = []): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Customer Session Test",
      hqId: HQ_ID,
      branchId: BRANCH_ID,
      branchName: "seongsu",
      eventId: EVENT_ID,
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "2",
      attendanceHint: "test",
      code: "2026",
      phase: "CHECKIN",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableCount: 2,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants,
    hearts: [],
    reports: [],
    auditLogs: [],
    seatingAssignments: [],
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null
  };
}

function createReservation(
  checkinCode: string,
  reservationId: string
): ExternalReservationSessionContext {
  return {
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId,
    reservationExternalId: null,
    reservationLabel: `${reservationId} reservation`,
    checkinCode,
    phone: null,
    gender: "M",
    eligible: true,
    status: "ACTIVE"
  };
}

function createParticipant(
  id: string,
  reservationId: string,
  tableId: number
): ParticipantRecord {
  return {
    id,
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId,
    reservationExternalId: null,
    phone: null,
    nickname: id,
    gender: "M",
    age: 29,
    jobCategory: "IT",
    job: "Engineer",
    photoUrl: null,
    heightCm: 175,
    animalType: "cat",
    energyType: "E",
    checkinMode: "qr",
    tableId,
    round2Attendance: "UNDECIDED",
    receivedHearts: 0,
    sentHearts: 0,
    profileViews: 0,
    heartsRemaining: 3,
    metParticipantIds: [],
    encounterHistory: [],
    likedParticipantIds: [],
    likedByParticipantIds: [],
    popularityScore: 0,
    tier: "C",
    subTier: "LOW",
    score: 0,
    attractionScore: 0,
    engagementScore: 0,
    isVip: false,
    isHighValue: false,
    joinedAt: "2026-04-23T10:00:00.000Z",
    lastActiveAt: "2026-04-23T10:00:00.000Z"
  };
}

async function bootFiles(snapshot: SessionSnapshot, reservations: ExternalReservationSessionContext[]) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-customer-session-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".mingle-data", "session.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(tempDir, ".mingle-data", "reservations.json"),
    JSON.stringify(reservations, null, 2),
    "utf8"
  );
  vi.resetModules();
  return tempDir;
}

function extractSessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie?.split(";")[0] ?? null;
}

function buildSessionCookie(participantId: string, reservationId: string, sessionVersion: number) {
  const response = NextResponse.json({ ok: true });
  issueCustomerSession(
    response,
    buildCustomerSession({
      participantId,
      reservationId,
      sessionId: SESSION_ID,
      sessionVersion
    })
  );

  return extractSessionCookie(response);
}

describe("customer signed session routes", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = "test-customer-session-secret";
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = originalSecret;
    vi.resetModules();
    while (tempDirs.length) {
      const tempDir = tempDirs.pop();
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("issues a signed customer session on SUCCESS check-in", async () => {
    const tempDir = await bootFiles(createSnapshot(), [createReservation("2001", "reservation_m_001")]);
    tempDirs.push(tempDir);

    const { POST } = await import("@/app/api/reservations/session-context/route");
    const response = await POST(
      new NextRequest("http://localhost/api/reservations/session-context", {
        method: "POST",
        body: JSON.stringify({ branchId: BRANCH_ID, tableId: 1, checkinCode: "2001" }),
        headers: { "content-type": "application/json" }
      })
    );
    const payload = await readRouteResponseData<{
      checkinResolution?: { flowState: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.checkinResolution?.flowState).toBe("SUCCESS");
    expect(response.headers.get("set-cookie")).toContain(SESSION_COOKIE_NAME);
  }, 30000);

  it("issues or refreshes a signed customer session on RE_ENTRY", async () => {
    const tempDir = await bootFiles(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", 1)]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(tempDir);

    const { POST } = await import("@/app/api/reservations/session-context/route");
    const response = await POST(
      new NextRequest("http://localhost/api/reservations/session-context", {
        method: "POST",
        body: JSON.stringify({ branchId: BRANCH_ID, tableId: 1, checkinCode: "2001" }),
        headers: { "content-type": "application/json" }
      })
    );
    const payload = await readRouteResponseData<{
      participantId?: string | null;
      checkinResolution?: { flowState: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(payload.participantId).toBe("participant_1");
    expect(response.headers.get("set-cookie")).toContain(SESSION_COOKIE_NAME);
  }, 30000);

  it("rejects customer mutations without a valid signed session", async () => {
    const tempDir = await bootFiles(
      createSnapshot([
        createParticipant("participant_1", "reservation_m_001", 1),
        createParticipant("participant_2", "reservation_m_002", 2)
      ]),
      [
        createReservation("2001", "reservation_m_001"),
        createReservation("2002", "reservation_m_002")
      ]
    );
    tempDirs.push(tempDir);

    const { POST } = await import("@/app/api/session/command/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        body: JSON.stringify({
          type: "customer.sendHeart",
          participantId: "participant_1",
          recipientId: "participant_2"
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(401);
  }, 30000);

  it("rejects customer mutations when payload participantId does not match the signed session", async () => {
    const tempDir = await bootFiles(
      createSnapshot([
        createParticipant("participant_1", "reservation_m_001", 1),
        createParticipant("participant_2", "reservation_m_002", 2)
      ]),
      [
        createReservation("2001", "reservation_m_001"),
        createReservation("2002", "reservation_m_002")
      ]
    );
    tempDirs.push(tempDir);

    const sessionContextRoute = await import("@/app/api/reservations/session-context/route");
    const checkinResponse = await sessionContextRoute.POST(
      new NextRequest("http://localhost/api/reservations/session-context", {
        method: "POST",
        body: JSON.stringify({ branchId: BRANCH_ID, tableId: 1, checkinCode: "2001" }),
        headers: { "content-type": "application/json" }
      })
    );
    const cookie = extractSessionCookie(checkinResponse);

    expect(cookie).toBeTruthy();

    const commandRoute = await import("@/app/api/session/command/route");
    const response = await commandRoute.POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        body: JSON.stringify({
          type: "customer.sendHeart",
          participantId: "participant_2",
          recipientId: "participant_1"
        }),
        headers: {
          "content-type": "application/json",
          cookie: cookie ?? ""
        }
      })
    );

    expect(response.status).toBe(401);
  }, 30000);

  it("restores current viewer identity from signed session rather than client cache alone", async () => {
    const tempDir = await bootFiles(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", 1)]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(tempDir);

    const sessionContextRoute = await import("@/app/api/reservations/session-context/route");
    const checkinResponse = await sessionContextRoute.POST(
      new NextRequest("http://localhost/api/reservations/session-context", {
        method: "POST",
        body: JSON.stringify({ branchId: BRANCH_ID, tableId: 1, checkinCode: "2001" }),
        headers: { "content-type": "application/json" }
      })
    );
    const cookie = extractSessionCookie(checkinResponse);
    const currentRoute = await import("@/app/api/session/current/route");

    const authorizedResponse = await currentRoute.GET(
      new NextRequest("http://localhost/api/session/current", {
        method: "GET",
        headers: cookie ? { cookie } : undefined
      })
    );
    const authorizedPayload = await readRouteResponseData<{
      data: unknown;
      currentParticipantId: string | null;
    }>(authorizedResponse);

    const anonymousResponse = await currentRoute.GET(
      new NextRequest("http://localhost/api/session/current", {
        method: "GET"
      })
    );
    const anonymousPayload = await readRouteResponseData<{
      data: unknown;
      currentParticipantId: string | null;
    }>(anonymousResponse);

    expect(authorizedPayload.currentParticipantId).toBe("participant_1");
    expect(anonymousPayload.currentParticipantId).toBeNull();
  }, 30000);

  it("blocks customer mutations for blacklisted participants even with a signed session", async () => {
    const tempDir = await bootFiles(
      {
        ...createSnapshot([
          createParticipant("participant_1", "reservation_m_001", 1),
          createParticipant("participant_2", "reservation_m_002", 2)
        ]),
        blacklist: [
          {
            id: "blacklist_1",
            sessionId: SESSION_ID,
            branchId: BRANCH_ID,
            participantId: "participant_1",
            reason: "운영 정책상 제한",
            createdAt: "2026-04-23T10:10:00.000Z"
          }
        ]
      },
      [
        createReservation("2001", "reservation_m_001"),
        createReservation("2002", "reservation_m_002")
      ]
    );
    tempDirs.push(tempDir);

    const cookie = buildSessionCookie("participant_1", "reservation_m_001", 1);
    const { POST } = await import("@/app/api/session/command/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        body: JSON.stringify({
          type: "customer.sendHeart",
          participantId: "participant_1",
          recipientId: "participant_2"
        }),
        headers: {
          "content-type": "application/json",
          cookie: cookie ?? ""
        }
      })
    );

    expect(response.status).toBe(403);
  }, 30000);
});
