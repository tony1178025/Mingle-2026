import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeedSnapshot, deepClone } from "@/lib/mingle";
import { normalizeAuthoritySnapshot } from "@/lib/repositories/snapshot-normalizer";
import type {
  AuthorityReadOptions,
  SessionAuthorityRepository
} from "@/lib/repositories/authority-types";
import type { SessionSnapshot } from "@/types/mingle";

type FileAuthorityRepositoryOptions = {
  dataDir?: string;
  snapshotFile?: string;
  createSnapshot?: () => SessionSnapshot;
};

export function createFileAuthorityRepository(
  options: FileAuthorityRepositoryOptions = {}
): SessionAuthorityRepository {
  const dataDir = options.dataDir ?? path.join(process.cwd(), ".mingle-data");
  const snapshotFile = options.snapshotFile ?? path.join(dataDir, "session.json");
  const createSnapshot = options.createSnapshot ?? createSeedSnapshot;

  let snapshotCache: SessionSnapshot | null = null;
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();

  async function getExistingSessionSnapshot(options: AuthorityReadOptions = {}) {
    if (snapshotCache && !options.fresh) {
      return deepClone(snapshotCache);
    }

    try {
      const raw = await readFile(snapshotFile, "utf8");
      snapshotCache = normalizeAuthoritySnapshot(JSON.parse(raw) as SessionSnapshot);
      return deepClone(snapshotCache);
    } catch {
      return null;
    }
  }

  async function persistSessionSnapshot(nextSnapshot: SessionSnapshot) {
    const normalized = normalizeAuthoritySnapshot(nextSnapshot);
    const persisted = {
      ...normalized,
      version: normalized.version + 1
    };

    await mkdir(dataDir, { recursive: true });
    await writeFile(snapshotFile, JSON.stringify(persisted, null, 2), "utf8");
    snapshotCache = deepClone(persisted);

    for (const listener of listeners) {
      listener(deepClone(persisted));
    }

    return deepClone(persisted);
  }

  async function getSessionSnapshot(options: AuthorityReadOptions = {}) {
    const existingSnapshot = await getExistingSessionSnapshot(options);
    if (existingSnapshot) {
      return existingSnapshot;
    }

    snapshotCache = normalizeAuthoritySnapshot(createSnapshot());
    await persistSessionSnapshot({ ...snapshotCache, version: 0 });
    return deepClone(snapshotCache);
  }

  return {
    kind: "file",
    getSessionSnapshot,
    getExistingSessionSnapshot,
    persistSessionSnapshot,
    subscribeToSessionSnapshots(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
