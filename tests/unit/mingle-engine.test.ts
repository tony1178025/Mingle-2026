import { applyRotationPreview, generateRotationPreview } from "@/engine/rotation";
import { buildRevealState, canRevealHeartSenders } from "@/engine/reveal";
import { createSeedSnapshot } from "@/lib/mingle";

describe("rotation engine", () => {
  it("keeps participant count stable and respects table capacity", () => {
    const snapshot = createSeedSnapshot();
    const preview = generateRotationPreview(snapshot);

    const assignedIds = preview.tablePreviews.flatMap((table) =>
      table.afterParticipants.map((participant) => participant.id)
    );

    expect(assignedIds).toHaveLength(snapshot.participants.length);
    expect(new Set(assignedIds).size).toBe(snapshot.participants.length);
    preview.tablePreviews.forEach((table, index) => {
      expect(table.afterParticipants.length).toBeLessThanOrEqual(preview.tableCapacityPlan[index]);
    });
  });

  it("applies preview and records previous peers as met participants", () => {
    const snapshot = createSeedSnapshot();
    const preview = generateRotationPreview(snapshot);
    const applied = applyRotationPreview(snapshot, preview);

    expect(applied.participants).toHaveLength(snapshot.participants.length);
    expect(
      applied.participants.every((participant) => participant.metParticipantIds.length >= 4)
    ).toBe(true);
    expect(applied.seatingAssignments[0]?.rotationRound).toBe(preview.rotationRound);
  });
});

describe("reveal rules", () => {
  it("requires round 2, admin toggle, and all 3 free hearts", () => {
    const snapshot = createSeedSnapshot();
    const participant = { ...snapshot.participants[0], usedFreeHearts: 3 };

    expect(
      canRevealHeartSenders({ ...snapshot.session, phase: "ROUND_1", revealSenders: true }, participant)
    ).toBe(false);
    expect(
      canRevealHeartSenders({ ...snapshot.session, phase: "ROUND_2", revealSenders: false }, participant)
    ).toBe(false);
    expect(
      canRevealHeartSenders(
        { ...snapshot.session, phase: "ROUND_2", revealSenders: true },
        { ...participant, usedFreeHearts: 2 }
      )
    ).toBe(false);
    expect(
      canRevealHeartSenders({ ...snapshot.session, phase: "ROUND_2", revealSenders: true }, participant)
    ).toBe(true);
  });

  it("surfaces the exact waiting states", () => {
    const snapshot = createSeedSnapshot();
    const participant = snapshot.participants[0];

    expect(
      buildRevealState({ ...snapshot.session, phase: "ROUND_1" }, participant, snapshot.hearts, snapshot.participants)
        .key
    ).toBe("round1-count-only");
    expect(
      buildRevealState(
        { ...snapshot.session, phase: "ROUND_2", revealSenders: false },
        participant,
        snapshot.hearts,
        snapshot.participants
      ).key
    ).toBe("round2-waiting-admin");
    expect(
      buildRevealState(
        { ...snapshot.session, phase: "ROUND_2", revealSenders: true },
        { ...participant, usedFreeHearts: 1 },
        snapshot.hearts,
        snapshot.participants
      ).key
    ).toBe("round2-waiting-user");
  });
});
