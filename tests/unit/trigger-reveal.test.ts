import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRevealState } from "@/engine/reveal";
import type { HeartRecord, ParticipantRecord, SessionPhase, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_reveal_test";
const BRANCH_ID = "branch_seongsu";

function participant(id: string, nickname: string): ParticipantRecord {
  return {
    id,
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId: `res_${id}`,
    reservationExternalId: null,
    phone: null,
    nickname,
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
    heartsRemaining: 0,
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

function snapshot(phase: SessionPhase, participants: ParticipantRecord[], hearts: HeartRecord[]): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Reveal Test",
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
      phase,
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableCount: 3,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants,
    hearts,
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

async function bootRepository(seed: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-reveal-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(seed, null, 2), "utf8");
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("admin.triggerReveal", () => {
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

  it("reveals in ROUND_2 and exposes correct senders", async () => {
    const receiver = participant("p_receiver", "receiver");
    const sender1 = participant("p_sender_1", "sender1");
    const sender2 = participant("p_sender_2", "sender2");
    const hearts: HeartRecord[] = [
      { id: "h1", sessionId: SESSION_ID, senderId: sender1.id, recipientId: receiver.id, createdAt: new Date().toISOString() },
      { id: "h2", sessionId: SESSION_ID, senderId: sender2.id, recipientId: receiver.id, createdAt: new Date().toISOString() }
    ];
    const seed = snapshot("ROUND_2", [receiver, sender1, sender2], hearts);
    const { tempDir, repository } = await bootRepository(seed);
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({ type: "admin.triggerReveal" });
    expect(result.snapshot.session.revealSenders).toBe(true);
    expect(result.snapshot.version).toBeGreaterThan(seed.version);

    const reveal = buildRevealState(result.snapshot.session, receiver, result.snapshot.hearts, result.snapshot.participants);
    expect(reveal.canReveal).toBe(true);
    expect(reveal.visibleSenders.map((p) => p.id).sort()).toEqual([sender1.id, sender2.id].sort());
  }, 30000);

  it("rejects reveal outside ROUND_2", async () => {
    const seed = snapshot("ROUND_1", [participant("p1", "alpha")], []);
    const { tempDir, repository } = await bootRepository(seed);
    tempDirs.push(tempDir);

    await expect(repository.executeServerCommand({ type: "admin.triggerReveal" })).rejects.toThrow(
      "하트 공개는 ROUND_2에서만 가능합니다."
    );
  }, 30000);

  it("blocks duplicate reveal", async () => {
    const seed = snapshot("ROUND_2", [participant("p1", "alpha")], []);
    const { tempDir, repository } = await bootRepository(seed);
    tempDirs.push(tempDir);

    await repository.executeServerCommand({ type: "admin.triggerReveal" });
    await expect(repository.executeServerCommand({ type: "admin.triggerReveal" })).rejects.toThrow(
      "이미 하트 공개가 완료되었습니다."
    );
  }, 30000);
});
