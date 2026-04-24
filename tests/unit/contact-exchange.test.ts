import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HeartRecord, ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_contact_test";
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

function snapshot(participants: ParticipantRecord[], hearts: HeartRecord[]): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Contact Test",
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
      phase: "ROUND_2",
      revealSenders: true,
      revealTriggeredAt: new Date().toISOString(),
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
    contactExchanges: [],
    announcements: [],
    rotationInstruction: null
  };
}

async function bootRepository(seed: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-contact-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(seed, null, 2), "utf8");
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("contact exchange policy", () => {
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

  it("completes contact exchange only after both consent", async () => {
    const a = participant("p_a", "alpha");
    const b = participant("p_b", "beta");
    const hearts: HeartRecord[] = [
      { id: "h1", sessionId: SESSION_ID, senderId: a.id, recipientId: b.id, createdAt: new Date().toISOString() },
      { id: "h2", sessionId: SESSION_ID, senderId: b.id, recipientId: a.id, createdAt: new Date().toISOString() }
    ];
    const { tempDir, repository } = await bootRepository(snapshot([a, b], hearts));
    tempDirs.push(tempDir);

    let result = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: a.id,
      targetParticipantId: b.id,
      consent: true,
      methods: { phone: "010-1234-5678" }
    });
    expect(result.snapshot.contactExchanges?.[0]?.status).toBe("PENDING");

    result = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: b.id,
      targetParticipantId: a.id,
      consent: true,
      methods: { kakaoId: "beta_kakao" }
    });
    expect(result.snapshot.contactExchanges?.[0]?.status).toBe("COMPLETED");
  }, 30000);

  it("rejects consent without at least one contact method", async () => {
    const a = participant("p_a", "alpha");
    const b = participant("p_b", "beta");
    const hearts: HeartRecord[] = [
      { id: "h1", sessionId: SESSION_ID, senderId: a.id, recipientId: b.id, createdAt: new Date().toISOString() },
      { id: "h2", sessionId: SESSION_ID, senderId: b.id, recipientId: a.id, createdAt: new Date().toISOString() }
    ];
    const { tempDir, repository } = await bootRepository(snapshot([a, b], hearts));
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "customer.submitContactExchangeConsent",
        participantId: a.id,
        targetParticipantId: b.id,
        consent: true,
        methods: {}
      })
    ).rejects.toThrow("연락수단(전화/카카오/인스타) 중 최소 1개를 입력해야 합니다.");
  }, 30000);

  it("propagates BLOCKED status to existing completed exchanges", async () => {
    const a = participant("p_a", "alpha");
    const b = participant("p_b", "beta");
    const hearts: HeartRecord[] = [
      { id: "h1", sessionId: SESSION_ID, senderId: a.id, recipientId: b.id, createdAt: new Date().toISOString() },
      { id: "h2", sessionId: SESSION_ID, senderId: b.id, recipientId: a.id, createdAt: new Date().toISOString() }
    ];
    const { tempDir, repository } = await bootRepository(snapshot([a, b], hearts));
    tempDirs.push(tempDir);

    await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: a.id,
      targetParticipantId: b.id,
      consent: true,
      methods: { phone: "010-1234-5678" }
    });
    const completed = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: b.id,
      targetParticipantId: a.id,
      consent: true,
      methods: { kakaoId: "beta_kakao" }
    });
    expect(completed.snapshot.contactExchanges?.[0]?.status).toBe("COMPLETED");

    const blocked = await repository.executeServerCommand({
      type: "admin.setBlacklistStatus",
      participantId: b.id,
      blocked: true,
      reason: "운영 제한 테스트"
    });
    expect(blocked.snapshot.contactExchanges?.[0]?.status).toBe("BLOCKED");
    expect(blocked.snapshot.contactExchanges?.[0]?.completedAt).toBeNull();
  }, 30000);

  it("hides contact methods in non-completed output snapshots", async () => {
    const a = participant("p_a", "alpha");
    const b = participant("p_b", "beta");
    const hearts: HeartRecord[] = [
      { id: "h1", sessionId: SESSION_ID, senderId: a.id, recipientId: b.id, createdAt: new Date().toISOString() },
      { id: "h2", sessionId: SESSION_ID, senderId: b.id, recipientId: a.id, createdAt: new Date().toISOString() }
    ];
    const { tempDir, repository } = await bootRepository(snapshot([a, b], hearts));
    tempDirs.push(tempDir);

    const pending = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: a.id,
      targetParticipantId: b.id,
      consent: true,
      methods: { phone: "010-1234-5678" }
    });

    const { sanitizeSnapshotForClient } = await import("@/lib/repositories/server-repository");
    const sanitized = sanitizeSnapshotForClient(pending.snapshot);
    expect(sanitized.contactExchanges?.[0]?.status).toBe("PENDING");
    expect(sanitized.contactExchanges?.[0]?.participantAMethods).toBeNull();
    expect(sanitized.contactExchanges?.[0]?.participantBMethods).toBeNull();
    expect(sanitized.contactExchangeStats?.pendingCount).toBe(1);
  }, 30000);
});
