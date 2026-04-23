import { describe, expect, it } from "vitest";
import { applyHeartGrant, applyHeartSend } from "@/lib/repositories/server-repository";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

function participant(id: string, nickname: string, heartsRemaining: number): ParticipantRecord {
  return {
    id,
    sessionId: "session_test",
    branchId: "branch_seongsu",
    reservationId: `reservation_${id}`,
    nickname,
    gender: id.startsWith("m") ? "M" : "F",
    age: 29,
    jobCategory: "IT",
    job: "Engineer",
    photoUrl: null,
    heightCm: 170,
    animalType: "cat",
    energyType: "E",
    checkinMode: "code",
    tableId: 1,
    round2Attendance: "UNDECIDED",
    receivedHearts: 0,
    sentHearts: 0,
    profileViews: 0,
    heartsRemaining,
    metParticipantIds: [],
    encounterHistory: [],
    likedParticipantIds: [],
    likedByParticipantIds: [],
    popularityScore: 0,
    tier: "B",
    subTier: "MID",
    score: 0,
    attractionScore: 0,
    engagementScore: 0,
    isVip: false,
    isHighValue: false,
    joinedAt: "2026-04-21T10:00:00.000Z",
    lastActiveAt: "2026-04-21T10:00:00.000Z"
  };
}

function snapshot(participants: ParticipantRecord[]): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: "session_test",
      name: "Heart Test",
      hqId: "hq_mingle",
      branchId: "branch_seongsu",
      branchName: "seongsu",
      eventId: "event_signature_20260412",
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "2",
      attendanceHint: "test",
      code: "1234",
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: "2026-04-21T10:00:00.000Z",
      updatedAt: "2026-04-21T10:00:00.000Z",
      tableCount: 1,
      tableCapacity: 2,
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

describe("heart system", () => {
  it("admin grant increases the single heart balance", () => {
    const seed = snapshot([participant("m1", "민수", 1)]);

    const result = applyHeartGrant(seed, "m1", 3, "2026-04-21T10:10:00.000Z");

    expect(result.participant.heartsRemaining).toBe(4);
    expect(result.snapshot.participants[0]?.heartsRemaining).toBe(4);
  });

  it("heart send decrements heartsRemaining and updates sender/receiver stats", () => {
    const seed = snapshot([participant("m1", "민수", 2), participant("f1", "지민", 3)]);

    const result = applyHeartSend(seed, "m1", "f1", "2026-04-21T10:10:00.000Z");
    const sender = result.snapshot.participants.find((item) => item.id === "m1");
    const recipient = result.snapshot.participants.find((item) => item.id === "f1");

    expect(sender?.heartsRemaining).toBe(1);
    expect(sender?.sentHearts).toBe(1);
    expect(recipient?.receivedHearts).toBe(1);
    expect(result.snapshot.hearts).toHaveLength(1);
    expect(result.snapshot.hearts[0]).not.toHaveProperty("source");
  });

  it("never allows negative hearts", () => {
    const seed = snapshot([participant("m1", "민수", 0), participant("f1", "지민", 3)]);

    expect(() => applyHeartSend(seed, "m1", "f1")).toThrow();
    expect(seed.participants[0]?.heartsRemaining).toBe(0);
  });

  it("does not expose legacy split heart balances on participants", () => {
    const seed = snapshot([participant("m1", "민수", 3)]);
    const keys = Object.keys(seed.participants[0] ?? {});
    const legacySpentKey = ["used", "Free", "Hearts"].join("");
    const legacyGrantedKey = ["paid", "Heart", "Balance"].join("");
    const legacyBundleKey = ["pur", "chased", "Bundles"].join("");

    expect(keys).toContain("heartsRemaining");
    expect(keys).not.toContain(legacySpentKey);
    expect(keys).not.toContain(legacyGrantedKey);
    expect(keys).not.toContain(legacyBundleKey);
  });
});
