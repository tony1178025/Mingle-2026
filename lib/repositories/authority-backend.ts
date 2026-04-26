import { logAuthorityFallback } from "@/lib/authority-monitoring";
import { createSeedSnapshot, deepClone } from "@/lib/mingle";
import { assertAuthorityConsistency } from "@/lib/repositories/authority-consistency";
import {
  isDbAuthorityConfigured,
  readFromDbAuthority
} from "@/lib/repositories/authority-config";
import {
  createDbAuthorityRepository,
  type DbAuthorityRepository
} from "@/lib/repositories/db-repository";
import { createFileAuthorityRepository } from "@/lib/repositories/file-repository";
import { normalizeAuthoritySnapshot } from "@/lib/repositories/snapshot-normalizer";
import type {
  AuthorityReadOptions,
  SessionAuthorityRepository
} from "@/lib/repositories/authority-types";
import type { SessionSnapshot } from "@/types/mingle";

export type AuthoritySource = "db" | "memory" | "file" | "unknown";

let runtimeAuthoritySource: AuthoritySource = "unknown";
let fileRepository: SessionAuthorityRepository | null = null;
let dbRepository: DbAuthorityRepository | null = null;
let authorityRepositoryOverride: SessionAuthorityRepository | null = null;
let compositeRepository: SessionAuthorityRepository | null = null;

export function isServerlessRuntime() {
  return process.env.VERCEL === "1";
}

function hasSupabaseUrl() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}

function hasSupabaseServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getAuthorityRuntimeDiagnostics() {
  return {
    source: runtimeAuthoritySource,
    env: {
      VERCEL: process.env.VERCEL ?? null,
      USE_DB_AUTHORITY: process.env.USE_DB_AUTHORITY ?? null,
      READ_FROM_DB: process.env.READ_FROM_DB ?? null,
      hasSupabaseUrl: hasSupabaseUrl(),
      hasSupabaseServiceRoleKey: hasSupabaseServiceRoleKey()
    }
  };
}

function getFileRepository() {
  fileRepository ??= createFileAuthorityRepository();
  return fileRepository;
}

export function getDbAuthorityRepository() {
  if (authorityRepositoryOverride?.kind === "db") {
    return authorityRepositoryOverride as DbAuthorityRepository;
  }

  if (!isDbAuthorityConfigured()) {
    return null;
  }

  dbRepository ??= createDbAuthorityRepository();
  return dbRepository;
}

function createCompositeAuthorityRepository(): SessionAuthorityRepository {
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();
  let memorySnapshot: SessionSnapshot | null = null;

  function notify(snapshot: SessionSnapshot) {
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function readMemorySnapshot() {
    runtimeAuthoritySource = "memory";
    return memorySnapshot ? deepClone(memorySnapshot) : null;
  }

  function upsertMemorySnapshot(snapshot: SessionSnapshot) {
    memorySnapshot = normalizeAuthoritySnapshot(snapshot);
    return deepClone(memorySnapshot);
  }

  function createSeedMemorySnapshot() {
    return upsertMemorySnapshot(createSeedSnapshot());
  }

  return {
    kind: readFromDbAuthority() ? "db" : "file",
    async getExistingSessionSnapshot(options: AuthorityReadOptions = {}) {
      try {
        const dbAuthority = getDbAuthorityRepository();
        if (readFromDbAuthority() && dbAuthority) {
          try {
            const dbSnapshot = await dbAuthority.getExistingSessionSnapshot(options);
            if (dbSnapshot) {
              runtimeAuthoritySource = "db";
              upsertMemorySnapshot(dbSnapshot);
              return dbSnapshot;
            }
          } catch (error) {
            logAuthorityFallback({
              reason: "db-read-error-fallback",
              sessionId: process.env.MINGLE_ACTIVE_SESSION_ID ?? null
            });
            console.error("[authority] db read failed, fallback path engaged", error);
          }

          logAuthorityFallback({
            reason: "db-missing-read-fallback",
            sessionId: process.env.MINGLE_ACTIVE_SESSION_ID ?? null
          });
        }

        const memory = readMemorySnapshot();
        if (memory) {
          return memory;
        }

        if (isServerlessRuntime()) {
          return createSeedMemorySnapshot();
        }

        const fileSnapshot = await getFileRepository().getExistingSessionSnapshot(options);
        if (fileSnapshot) {
          runtimeAuthoritySource = "file";
          upsertMemorySnapshot(fileSnapshot);
          return fileSnapshot;
        }
        return null;
      } catch (error) {
        logAuthorityFallback({
          reason: "existing-snapshot-read-error-fallback",
          sessionId: process.env.MINGLE_ACTIVE_SESSION_ID ?? null
        });
        console.error("[authority] getExistingSessionSnapshot fallback after error", error);
        const memory = readMemorySnapshot();
        if (memory) {
          return memory;
        }
        return createSeedMemorySnapshot();
      }
    },
    async getSessionSnapshot(options: AuthorityReadOptions = {}) {
      try {
        const existingSnapshot = await this.getExistingSessionSnapshot(options);
        if (existingSnapshot) {
          return existingSnapshot;
        }

        if (isServerlessRuntime()) {
          return createSeedMemorySnapshot();
        }

        const fileSnapshot = await getFileRepository().getSessionSnapshot(options);
        runtimeAuthoritySource = "file";
        upsertMemorySnapshot(fileSnapshot);
        return fileSnapshot;
      } catch (error) {
        logAuthorityFallback({
          reason: "session-snapshot-read-error-fallback",
          sessionId: process.env.MINGLE_ACTIVE_SESSION_ID ?? null
        });
        console.error("[authority] getSessionSnapshot fallback after error", error);
        const memory = readMemorySnapshot();
        if (memory) {
          return memory;
        }
        return createSeedMemorySnapshot();
      }
    },
    async persistSessionSnapshot(nextSnapshot: SessionSnapshot) {
      if (isServerlessRuntime()) {
        const dbAuthority = getDbAuthorityRepository();
        if (dbAuthority) {
          const dbSnapshot = await dbAuthority.persistSessionSnapshot(nextSnapshot);
          runtimeAuthoritySource = "db";
          upsertMemorySnapshot(dbSnapshot);
          notify(dbSnapshot);
          return dbSnapshot;
        }

        const normalized = normalizeAuthoritySnapshot(nextSnapshot);
        const persisted = upsertMemorySnapshot({
          ...normalized,
          version: normalized.version + 1
        });
        notify(persisted);
        return persisted;
      }

      const fileSnapshot = await getFileRepository().persistSessionSnapshot(nextSnapshot);
      runtimeAuthoritySource = "file";
      upsertMemorySnapshot(fileSnapshot);
      const dbAuthority = getDbAuthorityRepository();

      if (!dbAuthority) {
        notify(fileSnapshot);
        return fileSnapshot;
      }

      const dbSnapshot = await dbAuthority.persistSessionSnapshot(nextSnapshot);
      runtimeAuthoritySource = readFromDbAuthority() ? "db" : "file";
      await assertAuthorityConsistency({
        fileSnapshot,
        dbRepository: dbAuthority
      });

      const resolvedSnapshot = readFromDbAuthority() ? dbSnapshot : fileSnapshot;
      upsertMemorySnapshot(resolvedSnapshot);
      notify(resolvedSnapshot);
      return resolvedSnapshot;
    },
    subscribeToSessionSnapshots(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export function getSessionAuthorityRepository(): SessionAuthorityRepository {
  if (authorityRepositoryOverride) {
    return authorityRepositoryOverride;
  }

  compositeRepository ??= createCompositeAuthorityRepository();
  return compositeRepository;
}

export function setSessionAuthorityRepositoryForTests(
  repository: SessionAuthorityRepository | null
) {
  authorityRepositoryOverride = repository;
  fileRepository = null;
  dbRepository = null;
  compositeRepository = null;
}
