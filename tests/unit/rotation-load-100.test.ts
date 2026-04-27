import { describe, expect, it } from "vitest";
import { createSeedSnapshot } from "@/lib/mingle";
import { generateAdvancedRotationPreview } from "@/lib/algorithms/rotation-engine";

describe("rotation load with 100+ participants", () => {
  it("generates preview under large participant set", () => {
    const snapshot = createSeedSnapshot();
    const base = [...snapshot.participants];
    const extra = Array.from({ length: 100 - base.length }, (_, index) => {
      const source = base[index % base.length]!;
      return {
        ...source,
        id: `load_${index}`,
        nickname: `load_${index}`,
        tableId: (index % snapshot.session.tableCount) + 1
      };
    });
    snapshot.participants = [...base, ...extra];
    snapshot.session.phase = "ROUND_2";
    snapshot.participantStatusMap = Object.fromEntries(
      snapshot.participants.map((participant) => [participant.id, "ACTIVE" as const])
    );
    const preview = generateAdvancedRotationPreview(snapshot, 20260428);
    expect(preview.moves.length).toBeGreaterThan(0);
    expect(preview.tablePreviews.length).toBe(snapshot.session.tableCount);
  });
});
