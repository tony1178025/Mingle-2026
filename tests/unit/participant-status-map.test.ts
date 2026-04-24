import { describe, expect, it } from "vitest";
import {
  computeParticipantStatusMap,
  PARTICIPANT_GONE_THRESHOLD_MS
} from "@/lib/mingle";
import type { ParticipantRecord, SessionSnapshot } from "@/types/mingle";

const NOW = Date.now();
const SESSION_ID = "session_test";
const BRANCH_ID = "branch_seongsu";

function ts(offsetMs: number) {
  return new Date(NOW - offsetMs).toISOString();
}

function makeParticipant(id: string, lastActiveAt: string | null): ParticipantRecord {
  return {
    id,
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId: `reservation_${id}`,
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
    joinedAt: ts(60 * 60 * 1000),
    lastActiveAt
  };
}

function makeSnapshot(
  participants: ParticipantRecord[],
  blacklistedIds: string[] = []
): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Test",
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
      startedAt: ts(60 * 60 * 1000),
      updatedAt: ts(5 * 60 * 1000),
      tableCount: 5,
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
    rotationInstruction: null,
    blacklist: blacklistedIds.map((participantId, i) => ({
      id: `blacklist_${i}`,
      sessionId: SESSION_ID,
      branchId: BRANCH_ID,
      participantId,
      reason: "test",
      createdAt: ts(10 * 60 * 1000)
    }))
  };
}

describe("computeParticipantStatusMap", () => {
  it("classifies participant active 1 minute ago as ACTIVE", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(1 * 60 * 1000))]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("ACTIVE");
  });

  it("classifies participant active 30 minutes ago as ACTIVE (offline event normal gap)", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(30 * 60 * 1000))]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("ACTIVE");
  });

  it("classifies participant active 45 minutes ago as ACTIVE", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(45 * 60 * 1000))]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("ACTIVE");
  });

  it("classifies participant exactly at gone threshold as GONE", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(PARTICIPANT_GONE_THRESHOLD_MS))]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("GONE");
  });

  it("classifies participant past gone threshold as GONE", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(PARTICIPANT_GONE_THRESHOLD_MS + 60 * 1000))]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("GONE");
  });

  it("classifies participant with null lastActiveAt as IDLE (never used app)", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", null)]);
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("IDLE");
  });

  it("BLOCKED overrides ACTIVE for blacklisted participant", () => {
    const snapshot = makeSnapshot(
      [makeParticipant("p1", ts(1 * 60 * 1000))],
      ["p1"]
    );
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("BLOCKED");
  });

  it("BLOCKED overrides GONE for blacklisted participant", () => {
    const snapshot = makeSnapshot(
      [makeParticipant("p1", ts(PARTICIPANT_GONE_THRESHOLD_MS + 60 * 1000))],
      ["p1"]
    );
    expect(computeParticipantStatusMap(snapshot, NOW)["p1"]).toBe("BLOCKED");
  });

  it("handles snapshot without blacklist field", () => {
    const snapshot = makeSnapshot([makeParticipant("p1", ts(1 * 60 * 1000))]);
    const { blacklist: _, ...snapshotWithoutBlacklist } = snapshot;
    const map = computeParticipantStatusMap(snapshotWithoutBlacklist as SessionSnapshot, NOW);
    expect(map["p1"]).toBe("ACTIVE");
  });

  it("returns empty map for snapshot with no participants", () => {
    const snapshot = makeSnapshot([]);
    expect(Object.keys(computeParticipantStatusMap(snapshot, NOW))).toHaveLength(0);
  });

  it("computes correct statuses for a mixed participant set", () => {
    const snapshot = makeSnapshot(
      [
        makeParticipant("recent", ts(5 * 60 * 1000)),
        makeParticipant("stale_but_present", ts(45 * 60 * 1000)),
        makeParticipant("gone", ts(PARTICIPANT_GONE_THRESHOLD_MS + 60 * 1000)),
        makeParticipant("never_used_app", null),
        makeParticipant("blocked", ts(5 * 60 * 1000))
      ],
      ["blocked"]
    );
    const map = computeParticipantStatusMap(snapshot, NOW);

    expect(map["recent"]).toBe("ACTIVE");
    expect(map["stale_but_present"]).toBe("ACTIVE");
    expect(map["gone"]).toBe("GONE");
    expect(map["never_used_app"]).toBe("IDLE");
    expect(map["blocked"]).toBe("BLOCKED");
  });
});
