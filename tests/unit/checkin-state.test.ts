import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEmptyCheckinDraft } from "@/lib/mingle";
import type {
  CheckinResolution,
  ExternalReservationSessionContext,
  ParticipantRecord,
  ProfileDraft,
  SessionSnapshot
} from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_signature_20260412";
const HQ_ID = "hq_mingle";
const BRANCH_ID = "branch_seongsu";
const EVENT_ID = "event_signature_20260412";

function createParticipant(
  id: string,
  reservationId: string,
  nickname: string,
  options: Partial<ParticipantRecord> = {}
): ParticipantRecord {
  return {
    id,
    sessionId: options.sessionId ?? SESSION_ID,
    branchId: options.branchId ?? BRANCH_ID,
    reservationId,
    reservationExternalId: options.reservationExternalId ?? null,
    phone: options.phone ?? null,
    nickname,
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

function createSnapshot(participants: ParticipantRecord[]): SessionSnapshot {
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
    reservationLabel: options.reservationLabel ?? `${reservationId} reservation`,
    checkinCode,
    phone: options.phone ?? null,
    gender: options.gender ?? "M",
    eligible: options.eligible ?? true,
    status: options.status ?? "ACTIVE"
  };
}

function createProfileDraft(nickname: string): ProfileDraft {
  return {
    nickname,
    age: "29",
    jobCategory: "IT",
    job: "Engineer",
    photoUrl: "",
    heightCm: "175",
    animalType: "cat",
    energyType: "E"
  };
}

function createQrDraft(code: string) {
  return {
    ...createEmptyCheckinDraft(),
    value: `mingle://session/${SESSION_ID}?code=${code}`
  };
}

async function bootRepository(
  snapshot: SessionSnapshot,
  reservations: ExternalReservationSessionContext[]
) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-checkin-"));
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

  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

async function verifyCheckin(
  repository: typeof import("@/lib/repositories/server-repository"),
  code: string,
  participantId?: string | null
) {
  return repository.executeServerCommand({
    type: "customer.verifyCheckin",
    draft: createQrDraft(code),
    participantId: participantId ?? null
  });
}

describe("stable checkin authority", () => {
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

  it("keeps SUCCESS and RE_ENTRY distinct and returns participantId for both", async () => {
    let boot = await bootRepository(createSnapshot([]), [createReservation("2001", "reservation_m_001")]);
    tempDirs.push(boot.tempDir);
    let repository = await import("@/lib/repositories/server-repository");
    const success = await verifyCheckin(repository, "2001");

    expect(success.checkinResolution?.flowState).toBe("SUCCESS");
    expect(success.participantId).toBeTruthy();
    expect(success.checkinResolution?.participantId).toBe(success.participantId);

    boot = await bootRepository(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", "existing-name")]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(boot.tempDir);
    repository = await import("@/lib/repositories/server-repository");
    const reentry = await verifyCheckin(repository, "2001");

    expect(reentry.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(reentry.checkinResolution?.flowState).not.toBe("SUCCESS");
    expect(reentry.participantId).toBe("participant_1");
    expect(reentry.checkinResolution?.participantId).toBe("participant_1");
  }, 45000);

  it("recovers by reservation-linked identity instead of nickname", async () => {
    const boot = await bootRepository(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", "old-display-name")]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const result = await verifyCheckin(repository, "2001");

    expect(result.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(result.participantId).toBe("participant_1");
  }, 30000);

  it("keeps participantId as the primary recovery key when it is already known", async () => {
    const boot = await bootRepository(
      createSnapshot([
        createParticipant("participant_1", "reservation_m_001", "alpha", {
          reservationExternalId: "naver_booking_001",
          phone: "010-1111-2222"
        }),
        createParticipant("participant_2", "reservation_m_001", "beta", {
          reservationExternalId: "naver_booking_001",
          phone: "010-3333-4444"
        })
      ]),
      [
        createReservation("2001", "reservation_m_001", {
          reservationExternalId: "naver_booking_001",
          phone: "010-1111-2222"
        })
      ]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const result = await verifyCheckin(repository, "2001", "participant_1");

    expect(result.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(result.participantId).toBe("participant_1");
  }, 30000);

  it("persists normalized phone and reservation external identity on participant creation", async () => {
    const boot = await bootRepository(
      createSnapshot([]),
      [
        createReservation("2004", "reservation_m_004", {
          reservationExternalId: "naver_booking_004",
          phone: "010-9999-8888"
        })
      ]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");

    const verifyResult = await verifyCheckin(repository, "2004");
    const resolution = verifyResult.checkinResolution as CheckinResolution;
    const created = await repository.executeServerCommand({
      type: "customer.completeProfile",
      resolution,
      checkinMode: "qr",
      draft: createProfileDraft("phone-linked-user")
    });

    const participant = created.snapshot.participants.find(
      (item) => item.id === created.participantId
    );

    expect(participant?.phone).toBe("01099998888");
    expect(participant?.reservationExternalId).toBe("naver_booking_004");
  }, 30000);

  it("treats duplicate nickname as validation, not identity authority", async () => {
    const boot = await bootRepository(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", "same-nickname")]),
      [
        createReservation("2001", "reservation_m_001"),
        createReservation("2002", "reservation_m_002")
      ]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const verifyResult = await verifyCheckin(repository, "2002");
    const resolution = verifyResult.checkinResolution as CheckinResolution;

    expect(resolution.flowState).toBe("SUCCESS");
    expect(resolution.participantId).toBeTruthy();

    await expect(
      repository.executeServerCommand({
        type: "customer.completeProfile",
        resolution,
        checkinMode: "qr",
        draft: createProfileDraft("same-nickname")
      })
    ).rejects.toThrow();
  }, 30000);

  it("keeps BLOCKED distinct from FAILURE for authority conflicts", async () => {
    const boot = await bootRepository(
      createSnapshot([
        createParticipant("participant_1", "reservation_m_001", "alpha"),
        createParticipant("participant_2", "reservation_m_001", "beta")
      ]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const result = await verifyCheckin(repository, "2001");

    expect(result.checkinResolution?.flowState).toBe("BLOCKED");
    expect(result.checkinResolution?.flowState).not.toBe("FAILURE");
    expect(result.participantId).toBeNull();
  }, 30000);

  it("does not require phone for existing reservation-linked re-entry", async () => {
    const boot = await bootRepository(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", "alpha")]),
      [createReservation("2001", "reservation_m_001", { phone: null })]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const result = await verifyCheckin(repository, "2001");

    expect(result.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(result.participantId).toBe("participant_1");
  }, 30000);

  it("persists nickname changes without breaking reservation-linked re-entry", async () => {
    const boot = await bootRepository(
      createSnapshot([]),
      [createReservation("2003", "reservation_m_003", { phone: "010-1234-5678" })]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");

    const verifyResult = await verifyCheckin(repository, "2003");
    const resolution = verifyResult.checkinResolution as CheckinResolution;
    const created = await repository.executeServerCommand({
      type: "customer.completeProfile",
      resolution,
      checkinMode: "qr",
      draft: createProfileDraft("first-name")
    });
    const participantId = created.participantId ?? "";
    const storedParticipant = created.snapshot.participants.find((participant) => participant.id === participantId);

    expect(storedParticipant?.nickname).toBe("first-name");

    await repository.executeServerCommand({
      type: "customer.updateProfile",
      participantId,
      profile: {
        nickname: "updated-name",
        age: 29,
        jobCategory: "IT",
        job: "Engineer",
        heightCm: 175,
        animalType: "cat",
        energyType: "E",
        photoUrl: null
      }
    });

    const reentry = await verifyCheckin(repository, "2003", participantId);
    expect(reentry.checkinResolution?.flowState).toBe("RE_ENTRY");
    expect(reentry.participantId).toBe(participantId);
  }, 30000);

  it("rejects customer actions when participantId is not valid for the current session", async () => {
    const boot = await bootRepository(
      createSnapshot([createParticipant("participant_1", "reservation_m_001", "alpha")]),
      [createReservation("2001", "reservation_m_001")]
    );
    tempDirs.push(boot.tempDir);
    const repository = await import("@/lib/repositories/server-repository");

    await expect(
      repository.executeServerCommand({
        type: "customer.sendHeart",
        participantId: "missing_participant",
        recipientId: "participant_1"
      })
    ).rejects.toThrow();
  }, 30000);
});
