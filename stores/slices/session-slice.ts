import { createEmptyCheckinDraft, createEmptyProfileDraft } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { clearViewerState, getInitialViewerState, normalizeSnapshot } from "@/stores/helpers";
import type { SessionSlice, StoreSlice } from "@/stores/types";

export const createSessionSlice: StoreSlice<SessionSlice> = (set) => ({
  hydrated: false,
  snapshot: null,

  async hydrate() {
    const snapshot = normalizeSnapshot(await getMingleRepository().getSessionSnapshot());
    const viewerState = getInitialViewerState();
    const selectedTableId = viewerState.viewerParticipantId
      ? snapshot.participants.find((participant) => participant.id === viewerState.viewerParticipantId)?.tableId ?? 1
      : 1;

    set({
      snapshot,
      hydrated: true,
      viewerParticipantId: viewerState.viewerParticipantId,
      selectedTableId
    });
  },

  async syncFromRepository() {
    const snapshot = normalizeSnapshot(await getMingleRepository().getSessionSnapshot());
    set({ snapshot });
  },

  async resetDemo() {
    const snapshot = normalizeSnapshot(await getMingleRepository().resetDemo());
    clearViewerState();

    set({
      snapshot,
      hydrated: true,
      viewerParticipantId: null,
      rotationPreview: null,
      customerTab: "explore",
      adminPanel: "overview",
      selectedTableId: 1,
      checkinDraft: createEmptyCheckinDraft(),
      profileDraft: createEmptyProfileDraft(),
      toast: {
        tone: "info",
        message: "데모 세션을 초기 상태로 되돌렸습니다."
      }
    });
  }
});
