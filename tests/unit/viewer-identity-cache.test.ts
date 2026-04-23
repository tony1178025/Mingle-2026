import { beforeEach, describe, expect, it } from "vitest";
import {
  createSeedSnapshot,
  getCachedViewerState,
  setCachedParticipantId
} from "@/lib/mingle";
import {
  getInitialViewerState,
  normalizeSnapshot,
  syncCachedParticipantState
} from "@/stores/helpers";

describe("viewer identity cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores a participant only from server-validated session identity", () => {
    const snapshot = normalizeSnapshot(createSeedSnapshot());
    const participantId = snapshot.participants[0]?.id ?? null;

    setCachedParticipantId(participantId);
    const restored = getInitialViewerState(snapshot, participantId);

    expect(restored.currentParticipantId).toBe(participantId);
    expect(getCachedViewerState().cachedParticipantId).toBe(participantId);
  });

  it("does not restore viewer authority from local cache alone", () => {
    const snapshot = normalizeSnapshot(createSeedSnapshot());
    const participantId = snapshot.participants[0]?.id ?? null;

    setCachedParticipantId(participantId);
    const restored = getInitialViewerState(snapshot, null);

    expect(restored.currentParticipantId).toBeNull();
    expect(getCachedViewerState().cachedParticipantId).toBeNull();
  });

  it("clears runtime identity when the server no longer validates the participant", () => {
    const snapshot = normalizeSnapshot({
      ...createSeedSnapshot(),
      participants: []
    });

    setCachedParticipantId("stale_participant");
    const resolved = syncCachedParticipantState(snapshot, "stale_participant");

    expect(resolved.currentParticipantId).toBeNull();
    expect(getCachedViewerState().cachedParticipantId).toBeNull();
  });
});
