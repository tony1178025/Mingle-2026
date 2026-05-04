import { describe, expect, it } from "vitest";
import { createSeedSnapshot } from "@/lib/mingle";
import { sanitizeSnapshotForCustomer } from "@/lib/repositories/server-repository";
import { normalizeSnapshot } from "@/stores/helpers";
import type { SessionSnapshot } from "@/types/mingle";

const ROUND1_ALLOWED_FIELDS = [
  "id",
  "nickname",
  "profileImage",
  "tableLabel",
  "appearanceSummary",
  "personalitySummary",
  "preferenceSummary",
  "heartStatus"
] as const;

const ROUND1_BLOCKED_FIELDS = [
  "age",
  "job",
  "jobCategory",
  "phone",
  "contact",
  "birthYear",
  "tableId",
  "heightCm",
  "animalType",
  "energyType",
  "receivedHearts",
  "sentHearts",
  "profileViews",
  "encounterHistory",
  "metParticipantIds",
  "likedParticipantIds",
  "likedByParticipantIds"
] as const;

const ROUND2_ADDITIONAL_ALLOWED_FIELDS = ["age", "job", "jobCategory"] as const;
const ROUND2_BLOCKED_FIELDS = ["tableId", "tableLabel", "phone", "contact", "birthYear"] as const;
const ROUND1_BLOCKED_FIELDS_ALLOW_NULL = new Set<string>(["phone"]);

function toPhaseSnapshot(phase: SessionSnapshot["session"]["phase"]): SessionSnapshot {
  const snapshot = createSeedSnapshot();
  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      phase
    },
    participantStatusMap: {
      [snapshot.participants[0]!.id]: "BLOCKED",
      [snapshot.participants[1]!.id]: "LOGGED_OUT" as never
    }
  };
}

describe("customer api visibility contract", () => {
  it("enforces ROUND_1 participant list contract and tableLabel behavior", () => {
    const sanitized = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_1"));
    const participant = sanitized.participants[0] as unknown as Record<string, unknown>;
    expect(Object.keys(participant).sort()).toEqual([...ROUND1_ALLOWED_FIELDS].sort());
    for (const blockedField of ROUND1_BLOCKED_FIELDS) {
      expect(participant[blockedField]).toBeUndefined();
    }
    expect(participant.tableLabel).toBeTruthy();
    expect(typeof participant.heartStatus).toBe("object");
  });

  it("enforces ROUND_2 participant detail contract without table label/table id", () => {
    const sanitized = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_2"));
    const participant = sanitized.participants[0] as unknown as Record<string, unknown>;
    for (const allowedField of ROUND1_ALLOWED_FIELDS) {
      if (allowedField === "tableLabel") {
        expect(participant[allowedField]).toBeUndefined();
        continue;
      }
      expect(participant[allowedField]).toBeDefined();
    }
    for (const additionalField of ROUND2_ADDITIONAL_ALLOWED_FIELDS) {
      expect(participant[additionalField]).toBeDefined();
    }
    for (const blockedField of ROUND2_BLOCKED_FIELDS) {
      expect(participant[blockedField]).toBeUndefined();
    }
  });

  it("keeps customer list visibility stable on phase transition ROUND_1 -> ROUND_2", () => {
    const round1 = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_1"));
    const round2 = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_2"));
    const round1Participant = round1.participants[0] as unknown as Record<string, unknown>;
    const round2Participant = round2.participants[0] as unknown as Record<string, unknown>;
    expect(round1Participant.tableLabel).toBeTruthy();
    expect(round2Participant.tableLabel).toBeUndefined();
    expect(round1Participant.age).toBeUndefined();
    expect(round2Participant.age).toBeDefined();
  });

  it("does not restore removed ROUND_1 fields during client normalize", () => {
    const sanitized = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_1"));
    const normalized = normalizeSnapshot(sanitized);
    const participant = normalized.participants[0] as unknown as Record<string, unknown>;
    expect(participant.tableLabel).toBeTruthy();
    for (const blockedField of ROUND1_BLOCKED_FIELDS) {
      if (ROUND1_BLOCKED_FIELDS_ALLOW_NULL.has(blockedField)) {
        expect(participant[blockedField] ?? undefined).toBeUndefined();
        continue;
      }
      expect(participant[blockedField]).toBeUndefined();
    }
  });

  it("keeps blocked/logged-out participants visible in customer participant list", () => {
    const sanitized = sanitizeSnapshotForCustomer(toPhaseSnapshot("ROUND_1"));
    const participantIds = new Set(sanitized.participants.map((participant) => participant.id));
    const firstId = createSeedSnapshot().participants[0]!.id;
    const secondId = createSeedSnapshot().participants[1]!.id;
    expect(participantIds.has(firstId)).toBe(true);
    expect(participantIds.has(secondId)).toBe(true);
  });
});
