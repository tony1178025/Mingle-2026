import { createSeedSnapshot, deepClone, STORAGE_KEYS } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";
import type { MingleRepository } from "@/lib/repositories";

function resolveStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function createBrowserSeedRepository(): MingleRepository {
  let memorySnapshot = createSeedSnapshot();

  return {
    async getSessionSnapshot() {
      const storage = resolveStorage();
      if (!storage) return deepClone(memorySnapshot);

      const raw = storage.getItem(STORAGE_KEYS.snapshot);
      if (!raw) {
        const fresh = deepClone(memorySnapshot);
        storage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(fresh));
        return fresh;
      }

      try {
        const parsed = JSON.parse(raw) as SessionSnapshot;
        memorySnapshot = deepClone(parsed);
        return parsed;
      } catch {
        const fresh = createSeedSnapshot();
        memorySnapshot = deepClone(fresh);
        storage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(fresh));
        return fresh;
      }
    },

    async saveSessionSnapshot(snapshot) {
      memorySnapshot = deepClone(snapshot);
      const storage = resolveStorage();
      if (storage) {
        storage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(snapshot));
      }
      return deepClone(snapshot);
    },

    async resetDemo() {
      const fresh = createSeedSnapshot();
      memorySnapshot = deepClone(fresh);
      const storage = resolveStorage();
      if (storage) {
        storage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(fresh));
        storage.removeItem(STORAGE_KEYS.viewer);
      }
      return deepClone(fresh);
    }
  };
}
