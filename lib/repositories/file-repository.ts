import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeedSnapshot, deepClone } from "@/lib/mingle";
import { normalizeAuthoritySnapshot } from "@/lib/repositories/snapshot-normalizer";
import type {
  AuthorityReadOptions,
  SessionAuthorityRepository
} from "@/lib/repositories/authority-types";
import type { SessionSnapshot } from "@/types/mingle";

function isServerlessRuntime() {
  return process.env.VERCEL === "1";
}

type FileAuthorityRepositoryOptions = {
  dataDir?: string;
  snapshotFile?: string;
  createSnapshot?: () => SessionSnapshot;
};

export function createFileAuthorityRepository(
  options: FileAuthorityRepositoryOptions = {}
): SessionAuthorityRepository {
  const resolveDataDir = () => options.dataDir ?? path.join(process.cwd(), ".mingle-data");
  const resolveSnapshotFile = () => options.snapshotFile ?? path.join(resolveDataDir(), "session.json");
  const createSnapshot = options.createSnapshot ?? createSeedSnapshot;

  let snapshotCache: SessionSnapshot | null = null;
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();

  async function getExistingSessionSnapshot(options: AuthorityReadOptions = {}) {
    if (isServerlessRuntime()) {
      return null;
    }

    if (snapshotCache && !options.fresh) {
      return deepClone(snapshotCache);
    }

    try {
      const raw = await readFile(resolveSnapshotFile(), "utf8");
      snapshotCache = normalizeAuthoritySnapshot(JSON.parse(raw) as SessionSnapshot);
      return deepClone(snapshotCache);
    } catch {
      return null;
    }
  }

  async function persistSessionSnapshot(nextSnapshot: SessionSnapshot) {
    if (isServerlessRuntime()) {
      throw new Error(
        "File authority persistence is disabled in serverless runtime. Use DB or memory authority."
      );
    }

    const normalized = normalizeAuthoritySnapshot(nextSnapshot);
    const persisted = {
      ...normalized,
      version: normalized.version + 1
    };

    await mkdir(resolveDataDir(), { recursive: true });
    await writeFile(resolveSnapshotFile(), JSON.stringify(persisted, null, 2), "utf8");
    snapshotCache = deepClone(persisted);

    for (const listener of listeners) {
      listener(deepClone(persisted));
    }

    return deepClone(persisted);
  }

  async function getSessionSnapshot(options: AuthorityReadOptions = {}) {
    if (isServerlessRuntime()) {
      throw new Error(
        "File authority session reads are disabled in serverless runtime. Use DB or memory authority."
      );
    }

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
