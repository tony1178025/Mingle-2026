import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildTableSummaries } from "@/engine/heat";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_manual_test";
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
      name: "Manual Test",
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
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-manual-"));
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

describe("manual participant flow and table state classification", () => {
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

  it("creates a manual participant in snapshot and status map", async () => {
    const baseSnapshot = makeSnapshot([makeParticipant("p1", 1)]);
    const { tempDir, repository } = await bootRepository(baseSnapshot);
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.createManualParticipant",
      nickname: "walkin-guest",
      tableId: 2,
      gender: "F"
    });

    const created = result.snapshot.participants.find((p) => p.nickname === "walkin-guest");
    expect(created).toBeDefined();
    expect(created?.reservationId).toBeNull();
    expect(created?.checkinMode).toBe("staff");
    expect(created?.tableId).toBe(2);
    expect(created?.lastActiveAt).toBeNull();
    expect(created ? result.snapshot.participantStatusMap?.[created.id] : null).toBe("IDLE");
    expect(result.snapshot.version).toBeGreaterThan(baseSnapshot.version);
  }, 30000);

  it("moves manually created participant through existing moveParticipant command", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot([makeParticipant("p1", 1)]));
    tempDirs.push(tempDir);

    const createdResult = await repository.executeServerCommand({
      type: "admin.createManualParticipant",
      nickname: "manual-move",
      tableId: 1,
      gender: "M"
    });
    const created = createdResult.snapshot.participants.find((p) => p.nickname === "manual-move");
    expect(created).toBeDefined();

    const moved = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: created!.id,
      toTableId: 3
    });

    expect(moved.snapshot.participants.find((p) => p.id === created!.id)?.tableId).toBe(3);
  }, 30000);

  it("classifies table states from participant status counts", () => {
    const participants = [
      makeParticipant("a1", 1),
      makeParticipant("a2", 1),
      makeParticipant("a3", 1),
      makeParticipant("a4", 1),
      makeParticipant("a5", 2),
      makeParticipant("a6", 2),
      makeParticipant("a7", 2),
      makeParticipant("a8", 2),
      makeParticipant("a9", 2),
      makeParticipant("a10", 3),
      makeParticipant("a11", 3),
      makeParticipant("a12", 3),
      makeParticipant("a13", 3)
    ];
    const statusMap = {
      a1: "ACTIVE",
      a2: "ACTIVE",
      a3: "ACTIVE",
      a4: "ACTIVE",
      a5: "ACTIVE",
      a6: "ACTIVE",
      a7: "IDLE",
      a8: "IDLE",
      a9: "IDLE",
      a10: "ACTIVE",
      a11: "GONE",
      a12: "GONE",
      a13: "IDLE"
    } as const;

    const summaries = buildTableSummaries(participants, 3, 6, new Date().toISOString(), statusMap);

    expect(summaries.find((table) => table.tableId === 1)?.tableState).toBe("NORMAL");
    expect(summaries.find((table) => table.tableId === 2)?.tableState).toBe("LOW_ACTIVITY");
    expect(summaries.find((table) => table.tableId === 3)?.tableState).toBe("COLLAPSING");
  });

  it("rejects manual participant creation when gender is missing", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot([makeParticipant("p1", 1)]));
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.createManualParticipant",
        nickname: "missing-gender",
        tableId: 2
      } as never)
    ).rejects.toThrow("성별은 필수입니다.");
  }, 30000);
});
