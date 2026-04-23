import { logAuthorityFallback } from "@/lib/authority-monitoring";
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
import type {
  AuthorityReadOptions,
  SessionAuthorityRepository
} from "@/lib/repositories/authority-types";
import type { SessionSnapshot } from "@/types/mingle";

let fileRepository: SessionAuthorityRepository | null = null;
let dbRepository: DbAuthorityRepository | null = null;
let authorityRepositoryOverride: SessionAuthorityRepository | null = null;
let compositeRepository: SessionAuthorityRepository | null = null;

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

  function notify(snapshot: SessionSnapshot) {
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  return {
    kind: readFromDbAuthority() ? "db" : "file",
    async getExistingSessionSnapshot(options: AuthorityReadOptions = {}) {
      const dbAuthority = getDbAuthorityRepository();
      if (readFromDbAuthority() && dbAuthority) {
        const dbSnapshot = await dbAuthority.getExistingSessionSnapshot(options);
        if (dbSnapshot) {
          return dbSnapshot;
        }

        logAuthorityFallback({
          reason: "db-missing-read-fallback",
          sessionId: process.env.MINGLE_ACTIVE_SESSION_ID ?? null
        });
      }

      return getFileRepository().getExistingSessionSnapshot(options);
    },
    async getSessionSnapshot(options: AuthorityReadOptions = {}) {
      const existingSnapshot = await this.getExistingSessionSnapshot(options);
      if (existingSnapshot) {
        return existingSnapshot;
      }

      return getFileRepository().getSessionSnapshot(options);
    },
    async persistSessionSnapshot(nextSnapshot: SessionSnapshot) {
      const fileSnapshot = await getFileRepository().persistSessionSnapshot(nextSnapshot);
      const dbAuthority = getDbAuthorityRepository();

      if (!dbAuthority) {
        notify(fileSnapshot);
        return fileSnapshot;
      }

      const dbSnapshot = await dbAuthority.persistSessionSnapshot(nextSnapshot);
      await assertAuthorityConsistency({
        fileSnapshot,
        dbRepository: dbAuthority
      });

      const resolvedSnapshot = readFromDbAuthority() ? dbSnapshot : fileSnapshot;
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
