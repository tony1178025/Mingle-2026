import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_config_test";
const BRANCH_ID = "branch_seongsu";

function makeParticipant(id: string, tableId: number, lastActiveAt: string): ParticipantRecord {
  return {
    id,
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId: null,
    reservationExternalId: null,
    phone: null,
    nickname: `참가자-${id}`,
    gender: "M",
    age: 29,
    jobCategory: "운영",
    job: "현장",
    photoUrl: null,
    heightCm: 175,
    animalType: "곰상",
    energyType: "E",
    checkinMode: "staff",
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
    joinedAt: new Date().toISOString(),
    lastActiveAt
  };
}

function makeSnapshot(participants: ParticipantRecord[]): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Config Test",
      hqId: "hq_mingle",
      branchId: BRANCH_ID,
      branchName: "seongsu",
      eventId: "event_test",
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
      tableCount: 4,
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

async function bootRepository(snapshot: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-config-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".mingle-data", "session.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("admin.updateSessionConfig", () => {
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

  it("updates presence threshold and recalculates participant status map", async () => {
    const staleAt = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    const { tempDir, repository } = await bootRepository(makeSnapshot([makeParticipant("p1", 1, staleAt)]));
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.updateSessionConfig",
      config: { presenceGoneThresholdMinutes: 120 }
    });

    expect(result.snapshot.session.operationalConfig?.presenceGoneThresholdMinutes).toBe(120);
    expect(result.snapshot.participantStatusMap?.p1).toBe("ACTIVE");
  }, 30000);

  it("applies updated initial hearts to newly created manual participants", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot([]));
    tempDirs.push(tempDir);

    await repository.executeServerCommand({
      type: "admin.updateSessionConfig",
      config: { initialHearts: 7 }
    });
    const created = await repository.executeServerCommand({
      type: "admin.createManualParticipant",
      nickname: "현장등록",
      tableId: 1,
      gender: "F"
    });
    const participant = created.snapshot.participants.find((item) => item.nickname === "현장등록");
    expect(participant?.heartsRemaining).toBe(7);
  }, 30000);

  it("uses updated rotation deadline in rotation instructions", async () => {
    const now = new Date().toISOString();
    const participants = [makeParticipant("p1", 1, now), makeParticipant("p2", 2, now)];
    const { tempDir, repository } = await bootRepository(makeSnapshot(participants));
    tempDirs.push(tempDir);

    await repository.executeServerCommand({
      type: "admin.updateSessionConfig",
      config: { rotationDeadlineMinutes: 1 }
    });
    const previewResult = await repository.executeServerCommand({
      type: "admin.generateRotationPreview"
    });
    const applied = await repository.executeServerCommand({
      type: "admin.applyRotation",
      preview: previewResult.rotationPreview!
    });
    const instruction = applied.snapshot.rotationInstruction;
    expect(instruction).toBeTruthy();
    const windowMs =
      new Date(instruction!.deadlineAt).getTime() - new Date(instruction!.startsAt).getTime();
    expect(windowMs).toBeGreaterThanOrEqual(50_000);
    expect(windowMs).toBeLessThanOrEqual(70_000);
  }, 30000);
});

