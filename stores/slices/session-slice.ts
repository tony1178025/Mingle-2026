import { getMingleRepository } from "@/lib/repositories";
import { createToast } from "@/lib/mingle";
import {
  getInitialViewerState,
  normalizeSnapshot,
  syncCachedParticipantState
} from "@/stores/helpers";
import type { SessionSlice, StoreSlice } from "@/stores/types";

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  hydrated: false,
  snapshot: null,
  snapshotLoadErrorCode: null,
  snapshotLoadErrorMessage: null,

  async hydrate() {
    try {
      const response = await getMingleRepository().getSessionSnapshot();
      const snapshot = normalizeSnapshot(response.data);
      const viewerState = getInitialViewerState(snapshot, response.currentParticipantId);

      set((state) => {
        const currentVersion = state.snapshot?.version ?? -1;
        if (snapshot.version < currentVersion) {
          return { hydrated: true, snapshotLoadErrorCode: null, snapshotLoadErrorMessage: null };
        }
        return {
          snapshot,
          hydrated: true,
          snapshotLoadErrorCode: null,
          snapshotLoadErrorMessage: null,
          currentParticipantId: viewerState.currentParticipantId,
          selectedTableId: viewerState.selectedTableId,
          toast: null
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "세션 정보를 불러오지 못했습니다.";
      const match = /^\[([A-Z0-9_]+)\]\s*(.*)$/.exec(message);
      set({
        hydrated: true,
        snapshot: null,
        snapshotLoadErrorCode: match?.[1] ?? "SESSION_SNAPSHOT_LOAD_FAILED",
        snapshotLoadErrorMessage: match?.[2] || message,
        toast: createToast("warning", "세션 정보를 불러오지 못했습니다.")
      });
    }
  },

  async syncFromRepository() {
    try {
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
          snapshotLoadErrorCode: null,
          snapshotLoadErrorMessage: null,
          currentParticipantId: resolved.currentParticipantId,
          selectedTableId: resolved.selectedTableId
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const match = /^\[([A-Z0-9_]+)\]\s*(.*)$/.exec(message);
      set({
        snapshotLoadErrorCode: match?.[1] ?? "SESSION_SNAPSHOT_LOAD_FAILED",
        snapshotLoadErrorMessage: match?.[2] || "세션 정보를 불러오지 못했습니다."
      });
    }
  }
});
