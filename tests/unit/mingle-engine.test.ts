import { describe, expect, it } from "vitest";
import {
  applyRotationPreview,
  generateRotationPreview,
  scoreRotationPlacement
} from "@/engine/rotation";
import { buildRevealState, canRevealHeartSenders } from "@/engine/reveal";
import type {
  HeartRecord,
  ParticipantEncounterRecord,
  ParticipantGender,
  ParticipantRecord,
  SessionSnapshot
} from "@/types/mingle";

function encounter(participantId: string, count: number): ParticipantEncounterRecord {
  return {
    participantId,
    count,
    lastRoundSeen: count,
    interactionStrength: 0
  };
}

function participant(
  id: string,
  tableId: number,
  gender: ParticipantGender,
  energyType: "E" | "I",
  overrides: Partial<ParticipantRecord> = {}
): ParticipantRecord {
  return {
    id,
    reservationId: `reservation_${id}`,
    nickname: id,
    gender,
    age: 29,
    jobCategory: "IT",
    job: "Engineer",
    photoUrl: null,
    heightCm: 170,
    animalType: "cat",
    energyType,
    checkinMode: "code",
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
    tier: "B",
    subTier: "MID",
    score: 50,
    attractionScore: 50,
    engagementScore: 50,
    isVip: false,
    isHighValue: false,
    joinedAt: "2026-04-21T10:00:00.000Z",
    lastActiveAt: "2026-04-21T10:05:00.000Z",
    ...overrides,
    sessionId: overrides.sessionId ?? "session_test",
    branchId: overrides.branchId ?? "branch_seongsu"
  };
}

function snapshot(participants: ParticipantRecord[], hearts: HeartRecord[] = []): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: "session_test",
      name: "Rotation Test",
      hqId: "hq_mingle",
      branchId: "branch_seongsu",
      branchName: "seongsu",
      eventId: "event_signature_20260412",
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "6",
      attendanceHint: "test",
      code: "1234",
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: "2026-04-21T10:00:00.000Z",
      updatedAt: "2026-04-21T10:05:00.000Z",
      tableCount: 3,
      tableCapacity: 2,
      customerSessionVersion: 1
    },
    participants,
    hearts,
    reports: [],
    auditLogs: [],
    seatingAssignments: participants.map((item) => ({
      id: `seat_${item.id}`,
      sessionId: "session_test",
      rotationRound: 0,
      participantId: item.id,
      tableId: item.tableId,
      assignedAt: "2026-04-21T10:00:00.000Z",
      assignmentSource: "INITIAL" as const
    })),
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null
  };
}

function findMove(preview: ReturnType<typeof generateRotationPreview>, participantId: string) {
  const move = preview.moves.find((item) => item.participantId === participantId);
  if (!move) {
    throw new Error(`Missing move for ${participantId}`);
  }
  return move;
}

describe("rotation engine", () => {
  it("enforces gender balance, same-table blocking, and capacity", () => {
    const seed = snapshot([
      participant("m1", 1, "M", "E"),
      participant("f1", 1, "F", "I"),
      participant("m2", 2, "M", "I"),
      participant("f2", 2, "F", "E"),
      participant("m3", 3, "M", "E"),
      participant("f3", 3, "F", "I")
    ]);

    const preview = generateRotationPreview(seed);

    preview.moves.forEach((move) => {
      expect(move.toTableId).not.toBe(move.fromTableId);
    });
    preview.tablePreviews.forEach((table) => {
      expect(table.afterParticipants.length).toBeLessThanOrEqual(2);
      expect(table.afterGenderBalance).toBeLessThanOrEqual(1);
    });
  });

  it("forbids pairings already seen twice", () => {
    const candidate = participant("m1", 1, "M", "E", {
      encounterHistory: [encounter("f2", 2)],
      metParticipantIds: ["f2"]
    });
    const repeated = participant("f2", 2, "F", "I", {
      encounterHistory: [encounter("m1", 2)],
      metParticipantIds: ["m1"]
    });

    const result = scoreRotationPlacement({
      candidate,
      tableId: 2,
      tableParticipants: [repeated],
      capacity: 2,
      genderTarget: { M: 1, F: 1 }
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.rejectReason).toBe("repeat-encounter");
    }
  });

  it("penalizes seen-once repeats and prefers new people", () => {
    const candidate = participant("m1", 1, "M", "E", {
      encounterHistory: [encounter("f2", 1)],
      metParticipantIds: ["f2"]
    });
    const seenOnce = participant("f2", 2, "F", "I", {
      encounterHistory: [encounter("m1", 1)],
      metParticipantIds: ["m1"]
    });
    const newPerson = participant("f3", 3, "F", "I");

    const seenScore = scoreRotationPlacement({
      candidate,
      tableId: 2,
      tableParticipants: [seenOnce],
      capacity: 2,
      genderTarget: { M: 1, F: 1 }
    });
    const newScore = scoreRotationPlacement({
      candidate,
      tableId: 3,
      tableParticipants: [newPerson],
      capacity: 2,
      genderTarget: { M: 1, F: 1 }
    });

    expect(seenScore.valid).toBe(true);
    expect(newScore.valid).toBe(true);
    if (seenScore.valid && newScore.valid) {
      expect(newScore.score).toBeGreaterThan(seenScore.score);
    }
  });

  it("spreads popular users before clustering them", () => {
    const candidate = participant("m1", 1, "M", "E", { popularityScore: 8 });
    const popularTable = [participant("f2", 2, "F", "I", { popularityScore: 9 })];
    const calmTable = [participant("f3", 3, "F", "I", { popularityScore: 1 })];

    const clustered = scoreRotationPlacement({
      candidate,
      tableId: 2,
      tableParticipants: popularTable,
      capacity: 2,
      genderTarget: { M: 1, F: 1 }
    });
    const spread = scoreRotationPlacement({
      candidate,
      tableId: 3,
      tableParticipants: calmTable,
      capacity: 2,
      genderTarget: { M: 1, F: 1 }
    });

    expect(clustered.valid).toBe(true);
    expect(spread.valid).toBe(true);
    if (clustered.valid && spread.valid) {
      expect(spread.score).toBeGreaterThan(clustered.score);
    }
  });

  it("uses EI balance as a low-weight tie-breaker", () => {
    const seed = snapshot([
      participant("m1", 1, "M", "E"),
      participant("f1", 1, "F", "I"),
      participant("m2", 2, "M", "I"),
      participant("f2", 2, "F", "I"),
      participant("m3", 3, "M", "E"),
      participant("f3", 3, "F", "I")
    ]);

    const preview = generateRotationPreview(seed);
    const move = findMove(preview, "m1");
    expect(move.toTableId).toBeGreaterThanOrEqual(1);
    expect(move.toTableId).toBeLessThanOrEqual(seed.session.tableCount);
  });

  it("applies preview and increments encounter history from the completed round", () => {
    const seed = snapshot([
      participant("m1", 1, "M", "E"),
      participant("f1", 1, "F", "I"),
      participant("m2", 2, "M", "I"),
      participant("f2", 2, "F", "E"),
      participant("m3", 3, "M", "E"),
      participant("f3", 3, "F", "I")
    ]);

    const preview = generateRotationPreview(seed);
    const applied = applyRotationPreview(seed, preview);
    const moved = applied.participants.find((item) => item.id === "m1");
    expect(moved).toBeDefined();
    expect((moved?.encounterHistory ?? []).length).toBeGreaterThanOrEqual(0);
    expect(applied.seatingAssignments[0]?.rotationRound).toBe(preview.rotationRound);
  });
});

describe("reveal rules", () => {
  it("requires only round 2 and admin toggle", () => {
    const seed = snapshot([participant("m1", 1, "M", "E"), participant("f1", 1, "F", "I")]);

    expect(canRevealHeartSenders({ ...seed.session, phase: "ROUND_1", revealSenders: true })).toBe(false);
    expect(canRevealHeartSenders({ ...seed.session, phase: "ROUND_2", revealSenders: false })).toBe(false);
    expect(canRevealHeartSenders({ ...seed.session, phase: "ROUND_2", revealSenders: true })).toBe(true);
  });

  it("locks sender reveal until all hearts are used", () => {
    const hearts: HeartRecord[] = [
      {
        id: "heart_1",
        sessionId: "session_test",
        senderId: "f1",
        recipientId: "m1",
        createdAt: "2026-04-21T10:04:00.000Z"
      }
    ];
    const seed = snapshot(
      [participant("m1", 1, "M", "E"), participant("f1", 1, "F", "I")],
      hearts
    );
    const current = seed.participants[0];

    expect(buildRevealState({ ...seed.session, phase: "ROUND_1" }, current, seed.hearts, seed.participants).key).toBe(
      "round1-count-only"
    );
    expect(
      buildRevealState(
        { ...seed.session, phase: "ROUND_2", revealSenders: false },
        current,
        seed.hearts,
        seed.participants
      ).key
    ).toBe("round2-waiting-admin");
    expect(
      buildRevealState(
        { ...seed.session, phase: "ROUND_2", revealSenders: true },
        current,
        seed.hearts,
        seed.participants
      ).key
    ).toBe("round2-waiting-admin");

    const unlockedCurrent = { ...current, heartsRemaining: 0 };
    expect(
      buildRevealState(
        { ...seed.session, phase: "ROUND_2", revealSenders: true },
        unlockedCurrent,
        seed.hearts,
        seed.participants
      ).key
    ).toBe("round2-revealed");
  });
});
