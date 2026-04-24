import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_move_test";
const BRANCH_ID = "branch_seongsu";

function makeParticipant(id: string, tableId: number): ParticipantRecord {
  return {
    id,
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId: `res_${id}`,
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
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };
}

function makeSnapshot(participants: ParticipantRecord[], tableCount = 3): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Move Test",
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
      tableCount,
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
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-move-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".mingle-data", "session.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(tempDir, ".mingle-data", "reservations.json"),
    JSON.stringify([], null, 2),
    "utf8"
  );
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("admin.moveParticipant", () => {
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

  it("moves participant to the target table", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1), makeParticipant("p2", 2)])
    );
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: "p1",
      toTableId: 2
    });

    const moved = result.snapshot.participants.find((p) => p.id === "p1");
    expect(moved?.tableId).toBe(2);
  }, 30000);

  it("does not move any other participant", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1), makeParticipant("p2", 2)])
    );
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: "p1",
      toTableId: 2
    });

    const untouched = result.snapshot.participants.find((p) => p.id === "p2");
    expect(untouched?.tableId).toBe(2);
  }, 30000);

  it("creates a PARTICIPANT_MOVED audit log", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1)])
    );
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: "p1",
      toTableId: 2
    });

    const log = result.snapshot.auditLogs.find((l) => l.action === "PARTICIPANT_MOVED");
    expect(log).toBeDefined();
    expect(log?.metadata?.fromTableId).toBe(1);
    expect(log?.metadata?.toTableId).toBe(2);
  }, 30000);

  it("adds an ADMIN_MOVE seating assignment record", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1)])
    );
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: "p1",
      toTableId: 3
    });

    const seat = result.snapshot.seatingAssignments.find(
      (s) => s.participantId === "p1" && s.assignmentSource === "ADMIN_MOVE"
    );
    expect(seat?.tableId).toBe(3);
  }, 30000);

  it("increments snapshot version", async () => {
    const snapshot = makeSnapshot([makeParticipant("p1", 1)]);
    const { tempDir, repository } = await bootRepository(snapshot);
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: "p1",
      toTableId: 2
    });

    expect(result.snapshot.version).toBeGreaterThan(snapshot.version);
  }, 30000);

  it("rejects move to same table", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1)])
    );
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.moveParticipant",
        participantId: "p1",
        toTableId: 1
      })
    ).rejects.toThrow();
  }, 30000);

  it("rejects move to out-of-bounds table", async () => {
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1)], 3)
    );
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.moveParticipant",
        participantId: "p1",
        toTableId: 99
      })
    ).rejects.toThrow();
  }, 30000);

  it("rejects move when target table is at hard capacity", async () => {
    const crowded = Array.from({ length: 10 }, (_, i) =>
      makeParticipant(`crowd_${i}`, 2)
    );
    const { tempDir, repository } = await bootRepository(
      makeSnapshot([makeParticipant("p1", 1), ...crowded], 3)
    );
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.moveParticipant",
        participantId: "p1",
        toTableId: 2
      })
    ).rejects.toThrow();
  }, 30000);
}, 30000);
