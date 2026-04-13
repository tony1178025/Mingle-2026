import { classifyParticipants } from "@/engine/tiering";
import { getMingleRepository } from "@/lib/repositories";
import { MINGLE_CONSTANTS, getViewerState, setViewerParticipantId } from "@/lib/mingle";
import type { MingleStoreState, PersistSnapshot, SetState, SnapshotUpdater, UpdateSnapshot } from "@/stores/types";
import type { SessionSnapshot } from "@/types/mingle";

export function normalizeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  const participants = classifyParticipants(snapshot.participants);
  return {
    ...snapshot,
    participants,
    session: {
      ...snapshot.session,
      tableCount: snapshot.session.tableCount || MINGLE_CONSTANTS.tableCount,
      tableCapacity: snapshot.session.tableCapacity || MINGLE_CONSTANTS.tableCapacity
    }
  };
}

export function createPersistSnapshot(set: SetState): PersistSnapshot {
  return async (nextSnapshot, extra = {}) => {
    const normalized = normalizeSnapshot(nextSnapshot);
    set({ snapshot: normalized, ...extra });
    await getMingleRepository().saveSessionSnapshot(normalized);
  };
}

export function createUpdateSnapshot(
  set: SetState,
  get: () => MingleStoreState
): UpdateSnapshot {
  const persistSnapshot = createPersistSnapshot(set);

  return async (updater: SnapshotUpdater, extra = {}) => {
    const snapshot = get().snapshot;
    if (!snapshot) return null;
    const nextSnapshot = updater(snapshot);
    await persistSnapshot(nextSnapshot, extra);
    return normalizeSnapshot(nextSnapshot);
  };
}

export function getInitialViewerState() {
  return getViewerState();
}

export function clearViewerState() {
  setViewerParticipantId(null);
}
