import { describe, expect, it } from "vitest";
import { serializeParticipantForCustomer } from "@/lib/policies/participant-visibility-policy";
import { createSeedSnapshot } from "@/lib/mingle";
import { normalizeSnapshot } from "@/stores/helpers";

describe("participant visibility policy", () => {
  it("exposes only the minimal field set in ROUND_1", () => {
    const snapshot = createSeedSnapshot();
    const serialized = serializeParticipantForCustomer(snapshot.participants[0]!, "ROUND_1");
    expect(Object.keys(serialized).sort()).toEqual(
      [
        "appearanceSummary",
        "heartStatus",
        "id",
        "nickname",
        "personalitySummary",
        "preferenceSummary",
        "profileImage",
        "tableLabel"
      ].sort()
    );
    expect(serialized.tableLabel).toBeTruthy();
    expect(serialized.heartStatus).toEqual({ heartsRemaining: expect.any(Number) });
    const serializedRecord = serialized as unknown as Record<string, unknown>;
    expect(serializedRecord.heightCm).toBeUndefined();
    expect(serializedRecord.animalType).toBeUndefined();
    expect(serializedRecord.energyType).toBeUndefined();
    expect(serializedRecord.receivedHearts).toBeUndefined();
    expect(serializedRecord.sentHearts).toBeUndefined();
    expect(serializedRecord.profileViews).toBeUndefined();
    expect(serializedRecord.encounterHistory).toBeUndefined();
    expect(serializedRecord.metParticipantIds).toBeUndefined();
    expect(serializedRecord.likedParticipantIds).toBeUndefined();
    expect(serializedRecord.likedByParticipantIds).toBeUndefined();
  });

  it("exposes age and job in ROUND_2", () => {
    const snapshot = createSeedSnapshot();
    const serialized = serializeParticipantForCustomer(snapshot.participants[0]!, "ROUND_2");
    expect(Object.keys(serialized)).toEqual(
      expect.arrayContaining([
        "id",
        "nickname",
        "profileImage",
        "appearanceSummary",
        "personalitySummary",
        "preferenceSummary",
        "heartStatus",
        "age",
        "job",
        "jobCategory"
      ])
    );
    expect(typeof serialized.age).toBe("number");
    expect(typeof serialized.job).toBe("string");
    expect(serialized.tableLabel).toBeUndefined();
    const serializedRecord = serialized as unknown as Record<string, unknown>;
    expect(serializedRecord.tableId).toBeUndefined();
    expect(serializedRecord.phone).toBeUndefined();
    expect(serializedRecord.contact).toBeUndefined();
    expect(serializedRecord.birthYear).toBeUndefined();
  });

  it("does not regenerate removed fields after client normalize in ROUND_1", () => {
    const snapshot = createSeedSnapshot();
    const normalized = normalizeSnapshot({
      ...snapshot,
      session: { ...snapshot.session, phase: "ROUND_1" },
      participants: snapshot.participants.map((participant) =>
        serializeParticipantForCustomer(participant, "ROUND_1")
      )
    });
    const participant = normalized.participants[0] as unknown as Record<string, unknown>;
    expect(participant.heightCm).toBeUndefined();
    expect(participant.animalType).toBeUndefined();
    expect(participant.energyType).toBeUndefined();
    expect(participant.receivedHearts).toBeUndefined();
    expect(participant.sentHearts).toBeUndefined();
    expect(participant.profileViews).toBeUndefined();
    expect(participant.encounterHistory).toBeUndefined();
    expect(participant.metParticipantIds).toBeUndefined();
    expect(participant.likedParticipantIds).toBeUndefined();
    expect(participant.likedByParticipantIds).toBeUndefined();
  });
});
