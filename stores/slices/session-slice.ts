import { getMingleRepository } from "@/lib/repositories";
import {
  getInitialViewerState,
  normalizeSnapshot,
  syncCachedParticipantState
} from "@/stores/helpers";
import type { SessionSlice, StoreSlice } from "@/stores/types";

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  hydrated: false,
  snapshot: null,

  async hydrate() {
    const response = await getMingleRepository().getSessionSnapshot();
    const snapshot = normalizeSnapshot(response.data);
    const viewerState = getInitialViewerState(snapshot, response.currentParticipantId);

    set((state) => {
      const currentVersion = state.snapshot?.version ?? -1;
      if (snapshot.version < currentVersion) {
        return { hydrated: true };
      }
      return {
        snapshot,
        hydrated: true,
        currentParticipantId: viewerState.currentParticipantId,
        selectedTableId: viewerState.selectedTableId,
        toast: null
      };
    });
  },

  async syncFromRepository() {
    const response = await getMingleRepository().getSessionSnapshot();
    const snapshot = normalizeSnapshot(response.data);
    const resolved = syncCachedParticipantState(snapshot, response.currentParticipantId);
    set((state) => {
      const currentVersion = state.snapshot?.version ?? -1;
      if (snapshot.version < currentVersion) {
        return {};
      }
      return {
        snapshot,
        currentParticipantId: resolved.currentParticipantId,
        selectedTableId: resolved.selectedTableId
      };
    });
  }
});
