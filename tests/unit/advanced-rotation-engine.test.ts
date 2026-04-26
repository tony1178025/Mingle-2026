import { describe, expect, it } from "vitest";
import { generateAdvancedRotationPreview } from "@/lib/algorithms/rotation-engine";
import { createSeedSnapshot } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";

function makeSnapshot(): SessionSnapshot {
  const snapshot = createSeedSnapshot();
  snapshot.session.phase = "ROUND_2";
  snapshot.participantStatusMap = Object.fromEntries(
    snapshot.participants.map((participant) => [participant.id, "ACTIVE" as const])
  );
  return snapshot;
}

describe("advanced rotation engine", () => {
  it("excludes blocked participants from move candidates", () => {
    const snapshot = makeSnapshot();
    const blockedId = snapshot.blacklist?.[0]?.participantId;
    const preview = generateAdvancedRotationPreview(snapshot, 1);
    expect(preview.moves.some((move) => move.participantId === blockedId)).toBe(false);
  });

  it("excludes inactive participants from move candidates", () => {
    const snapshot = makeSnapshot();
    const target = snapshot.participants[0]!;
    snapshot.participantStatusMap![target.id] = "IDLE";
    const preview = generateAdvancedRotationPreview(snapshot, 1);
    expect(preview.moves.some((move) => move.participantId === target.id)).toBe(false);
  });

  it("respects hard max table size", () => {
    const snapshot = makeSnapshot();
    const preview = generateAdvancedRotationPreview(snapshot, 1);
    for (const table of preview.tablePreviews) {
      expect(table.afterParticipants.length).toBeLessThanOrEqual(10);
    }
  });

  it("keeps gender constraint or female shortage exception per table", () => {
    const snapshot = makeSnapshot();
    const preview = generateAdvancedRotationPreview(snapshot, 77);
    for (const table of preview.tablePreviews) {
      const males = table.afterParticipants.filter((item) => item.gender === "M").length;
      const females = table.afterParticipants.filter((item) => item.gender === "F").length;
      const femaleShortageException = females === 2 && males === 4;
      expect(males <= females + 1 || femaleShortageException).toBe(true);
    }
  });

  it("reduces same-table re-encounter pressure", () => {
    const snapshot = makeSnapshot();
    const preview = generateAdvancedRotationPreview(snapshot, 11);
    expect(preview.tablePreviews.some((table) => table.afterRepeatMeetings <= table.beforeRepeatMeetings)).toBe(true);
  });

  it("supports deterministic output with the same seed", () => {
    const snapshot = makeSnapshot();
    const previewA = generateAdvancedRotationPreview(snapshot, 42);
    const previewB = generateAdvancedRotationPreview(snapshot, 42);
    expect(previewA.moves).toEqual(previewB.moves);
  });
});
