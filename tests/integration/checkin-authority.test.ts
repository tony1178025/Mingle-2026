import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import type {
  ExternalReservationSessionContext,
  ParticipantRecord,
  SessionSnapshot
} from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_signature_20260412";
const HQ_ID = "hq_mingle";
const BRANCH_ID = "branch_seongsu";
const EVENT_ID = "event_signature_20260412";

function createSnapshot(participants: ParticipantRecord[] = []): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Checkin Test",
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
      startedAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
      tableCount: 1,
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
  reservationId: string,
  options: Partial<ExternalReservationSessionContext> = {}
): ExternalReservationSessionContext {
  return {
    sessionId: SESSION_ID,
    branchId: options.branchId ?? BRANCH_ID,
    reservationId,
    reservationExternalId: options.reservationExternalId ?? null,
    reservationLabel: options.reservationLabel ?? `${reservationId} 예약`,
    checkinCode,
    phone: options.phone ?? null,
    gender: options.gender ?? "M",
    eligible: options.eligible ?? true,
    status: options.status ?? "ACTIVE"
  };
}

function createParticipant(
  id: string,
  reservationId: string,
  options: Partial<ParticipantRecord> = {}
): ParticipantRecord {
  return {
    id,
    sessionId: options.sessionId ?? SESSION_ID,
    branchId: options.branchId ?? BRANCH_ID,
    reservationId,
    reservationExternalId: options.reservationExternalId ?? null,
    phone: options.phone ?? null,
    nickname: options.nickname ?? "기존 참가자",
    gender: options.gender ?? "M",
    age: options.age ?? 29,
    jobCategory: options.jobCategory ?? "IT",
    job: options.job ?? "Engineer",
    photoUrl: options.photoUrl ?? null,
    heightCm: options.heightCm ?? 175,
    animalType: options.animalType ?? "cat",
    energyType: options.energyType ?? "E",
    checkinMode: options.checkinMode ?? "qr",
    tableId: options.tableId ?? 1,
    round2Attendance: options.round2Attendance ?? "UNDECIDED",
    receivedHearts: options.receivedHearts ?? 0,
    sentHearts: options.sentHearts ?? 0,
    profileViews: options.profileViews ?? 0,
    heartsRemaining: options.heartsRemaining ?? 3,
    metParticipantIds: options.metParticipantIds ?? [],
    encounterHistory: options.encounterHistory ?? [],
    likedParticipantIds: options.likedParticipantIds ?? [],
    likedByParticipantIds: options.likedByParticipantIds ?? [],
    popularityScore: options.popularityScore ?? 0,
    tier: options.tier ?? "C",
    subTier: options.subTier ?? "LOW",
    score: options.score ?? 0,
    attractionScore: options.attractionScore ?? 0,
    engagementScore: options.engagementScore ?? 0,
    isVip: options.isVip ?? false,
    isHighValue: options.isHighValue ?? false,
    joinedAt: options.joinedAt ?? "2026-04-22T10:00:00.000Z",
    lastActiveAt: options.lastActiveAt ?? "2026-04-22T10:00:00.000Z"
  };
}

async function bootFiles(snapshot: SessionSnapshot, reservations: ExternalReservationSessionContext[]) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-checkin-route-"));
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

async function requestSessionContext(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/reservations/session-context/route");
  const request = new NextRequest("http://localhost/api/reservations/session-context", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });

  const response = await POST(request);
  const payload = (await response.json()) as {
    participantId?: string | null;
    checkinResolution?: {
      flowState: string;
      participantId: string | null;
      reservationExternalId?: string | null;
      phone?: string | null;
    };
  };

  return { response, payload };
}

describe("reservation session-context route", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.resetModules();
    while (tempDirs.length) {
      const tempDir = tempDirs.pop();
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("returns SUCCESS from the external reservation adapter path", async () => {
    const tempDir = await bootFiles(createSnapshot(), [createReservation("2001", "reservation_m_001")]);
    tempDirs.push(tempDir);

    const { response, payload } = await requestSessionContext({
      sessionId: SESSION_ID,
      checkinCode: "2001"
    });

    expect(response.status).toBe(200);
    expect(payload.checkinResolution?.flowState).toBe("SUCCESS");
    expect(payload.participantId).toBeTruthy();
    expect(payload.checkinResolution?.participantId).toBe(payload.participantId);
  }, 30000);

  it("returns RE_ENTRY when the reservation-linked participant already exists", async () => {
    const tempDir = await bootFiles(
      createSnapshot([createParticipant("participant_1", "reservation_m_001")]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(tempDir);

    const { response, payload } = await requestSessionContext({
      sessionId: SESSION_ID,
      checkinCode: "2001"
    });

    expect(response.status).toBe(200);
    expect(payload.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(payload.participantId).toBe("participant_1");
    expect(payload.checkinResolution?.participantId).toBe("participant_1");
  }, 30000);

  it("keeps participantId as the primary recovery key when it is already known", async () => {
    const tempDir = await bootFiles(
      createSnapshot([
        createParticipant("participant_1", "reservation_m_001", {
          reservationExternalId: "naver_booking_001",
          phone: "010-1111-2222",
          nickname: "alpha"
        }),
        createParticipant("participant_2", "reservation_m_001", {
          reservationExternalId: "naver_booking_001",
          phone: "010-3333-4444",
          nickname: "beta"
        })
      ]),
      [
        createReservation("2001", "reservation_m_001", {
          reservationExternalId: "naver_booking_001",
          phone: "010-1111-2222"
        })
      ]
    );
    tempDirs.push(tempDir);

    const { payload } = await requestSessionContext({
      sessionId: SESSION_ID,
      checkinCode: "2001",
      participantId: "participant_1"
    });

    expect(payload.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(payload.participantId).toBe("participant_1");
  }, 30000);

  it("uses reservationExternalId mapping before falling back to reservationId", async () => {
    const tempDir = await bootFiles(
      createSnapshot([
        createParticipant("participant_1", "legacy_reservation_id", {
          reservationExternalId: "naver_booking_002",
          phone: "010-5555-6666"
        })
      ]),
      [
        createReservation("2002", "reservation_m_002", {
          reservationExternalId: "naver_booking_002",
          phone: "010-5555-6666"
        })
      ]
    );
    tempDirs.push(tempDir);

    const { payload } = await requestSessionContext({
      sessionId: SESSION_ID,
      checkinCode: "2002"
    });

    expect(payload.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(payload.participantId).toBe("participant_1");
    expect(payload.checkinResolution?.reservationExternalId).toBe("naver_booking_002");
    expect(payload.checkinResolution?.phone).toBe("01055556666");
  }, 30000);

  it("returns BLOCKED when the recovered participant is blacklisted", async () => {
    const targetParticipant = createParticipant("participant_1", "reservation_m_001", {
      phone: "010-1111-2222"
    });
    const tempDir = await bootFiles(
      {
        ...createSnapshot([targetParticipant]),
        blacklist: [
          {
            id: "blacklist_1",
            sessionId: SESSION_ID,
            branchId: BRANCH_ID,
            participantId: targetParticipant.id,
            reason: "운영 정책상 제한",
            createdAt: "2026-04-22T10:00:00.000Z"
          }
        ]
      },
      [
        createReservation("2003", "reservation_m_001", {
          phone: "010-1111-2222"
        })
      ]
    );
    tempDirs.push(tempDir);

    const { payload } = await requestSessionContext({
      sessionId: SESSION_ID,
      checkinCode: "2003"
    });

    expect(payload.checkinResolution?.flowState).toBe("BLOCKED");
    expect(payload.participantId).toBeNull();
  }, 30000);
});
