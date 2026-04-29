import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const BRANCH_ID = "branch_seongsu";
const SESSION_ID = "session_signature_20260412";

function createParticipant(id: string, reservationId: string): ParticipantRecord {
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
    tableId: 1,
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

function createSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  const base: SessionSnapshot = {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "QR Lifecycle Test",
      hqId: "hq_mingle",
      branchId: BRANCH_ID,
      branchName: "seongsu",
      eventId: "event_qr_lifecycle",
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "2",
      attendanceHint: "test",
      code: "2026",
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableCount: 2,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants: [],
    hearts: [],
    reports: [],
    auditLogs: [],
    seatingAssignments: [],
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null,
    tableQrCodes: [
      {
        id: "table_qr_1",
        branchId: BRANCH_ID,
        sessionId: SESSION_ID,
        tableId: 1,
        code: "1111",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        revokedAt: null
      }
    ]
  };
  return {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...(overrides.session ?? {})
    }
  };
}

async function bootRepository(snapshot: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-qr-lifecycle-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("qr lifecycle contract", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.resetModules();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  it("revokes active QR and blocks old code check-in", async () => {
    const { tempDir, repository } = await bootRepository(createSnapshot());
    tempDirs.push(tempDir);

    const revoke = await repository.executeServerCommand({
      type: "admin.revokeTableQr",
      sessionId: SESSION_ID,
      tableId: 1
    });
    const revokedQr = (revoke.snapshot.tableQrCodes ?? []).find(
      (item) => item.tableId === 1 && item.code === "1111"
    );
    expect(revokedQr?.status).toBe("REVOKED");

    const verify = await repository.executeServerCommand({
      type: "customer.verifyCheckin",
      draft: {
        value: `mingle://table/${BRANCH_ID}/1?code=1111`,
        flowState: "IDLE",
        customerMessage: null,
        customerSecondaryMessage: null,
        isSubmitting: false,
        isVerified: false,
        error: null,
        resolution: null
      },
      participantId: null
    });
    expect(verify.checkinResolution?.flowState).toBe("BLOCKED");
  });

  it("regenerate replaces active QR and blocks previous code", async () => {
    const { tempDir, repository } = await bootRepository(createSnapshot());
    tempDirs.push(tempDir);

    const regenerated = await repository.executeServerCommand({
      type: "admin.regenerateTableQr",
      sessionId: SESSION_ID,
      tableId: 1
    });
    const active = (regenerated.snapshot.tableQrCodes ?? []).find(
      (item) => item.tableId === 1 && item.status === "ACTIVE"
    );
    expect(active?.code).toBeTruthy();
    expect(active?.code).not.toBe("1111");

    const oldCodeTry = await repository.executeServerCommand({
      type: "customer.verifyCheckin",
      draft: {
        value: `mingle://table/${BRANCH_ID}/1?code=1111`,
        flowState: "IDLE",
        customerMessage: null,
        customerSecondaryMessage: null,
        isSubmitting: false,
        isVerified: false,
        error: null,
        resolution: null
      },
      participantId: null
    });
    expect(oldCodeTry.checkinResolution?.flowState).toBe("BLOCKED");
  });

  it("blocks check-in when session is closed and prevents duplicate participant creation", async () => {
    const existing = createParticipant("participant_1", "reservation_1");
    const base = createSnapshot();
    const { tempDir, repository } = await bootRepository(
      createSnapshot({
        session: {
          ...base.session,
          phase: "CLOSED"
        },
        participants: [existing]
      })
    );
    tempDirs.push(tempDir);

    const closedTry = await repository.executeServerCommand({
      type: "customer.verifyCheckin",
      draft: {
        value: `mingle://table/${BRANCH_ID}/1?code=1111`,
        flowState: "IDLE",
        customerMessage: null,
        customerSecondaryMessage: null,
        isSubmitting: false,
        isVerified: false,
        error: null,
        resolution: null
      },
      participantId: null
    });
    expect(closedTry.checkinResolution?.flowState).toBe("BLOCKED");

    await expect(
      repository.executeServerCommand({
        type: "customer.completeProfile",
        resolution: {
          sessionId: SESSION_ID,
          branchId: BRANCH_ID,
          tableId: 1,
          reservationId: "reservation_1",
          reservationExternalId: null,
          participantId: "participant_1",
          phone: null,
          gender: "M",
          reservationLabel: "기존 예약",
          checkinCode: "1111",
          flowState: "SUCCESS",
          customerMessage: null,
          customerSecondaryMessage: null
        },
        checkinMode: "qr",
        draft: {
          nickname: "duplicate",
          age: "29",
          jobCategory: "IT",
          job: "Engineer",
          photoUrl: "",
          heightCm: "175",
          animalType: "cat",
          energyType: "E"
        }
      })
    ).rejects.toThrow();
  });
});
