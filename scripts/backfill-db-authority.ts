import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logBackfillResult } from "../lib/authority-monitoring.ts";
import type { SessionSnapshot } from "../types/mingle.ts";

export type BackfillDuplicate = {
  sessionId: string;
  files: string[];
};

export type BackfillSessionResult = {
  snapshotFile: string;
  sessionId: string | null;
  status: "success" | "failure" | "duplicate";
  dryRun: boolean;
  message?: string;
};

export type BackfillReport = {
  rootPath: string;
  dryRun: boolean;
  totalSessions: number;
  success: number;
  failure: number;
  duplicates: BackfillDuplicate[];
  results: BackfillSessionResult[];
};

type BackfillOptions = {
  rootPath: string;
  dryRun?: boolean;
  repository?: {
    upsertExistingSessionSnapshot(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
  };
};

function normalizeSnapshotForBackfill(snapshot: SessionSnapshot): SessionSnapshot {
  if (!snapshot?.session?.id?.trim()) {
    throw new Error("snapshot.session.id is required");
  }

  return {
    ...snapshot,
    version: Number.isFinite(snapshot.version) ? snapshot.version : 0,
    session: {
      ...snapshot.session,
      branchId: snapshot.session.branchId || "branch_unknown",
      customerSessionVersion: snapshot.session.customerSessionVersion ?? 1
    },
    participants: (snapshot.participants ?? []).map((participant) => {
      if (!participant.id?.trim()) {
        throw new Error("participant.id is required");
      }

      return {
        ...participant,
        sessionId: participant.sessionId || snapshot.session.id,
        branchId: participant.branchId || snapshot.session.branchId || "branch_unknown"
      };
    }),
    hearts: snapshot.hearts ?? [],
    reports: snapshot.reports ?? [],
    blacklist: snapshot.blacklist ?? [],
    incidents: snapshot.incidents ?? [],
    auditLogs: snapshot.auditLogs ?? [],
    seatingAssignments: snapshot.seatingAssignments ?? [],
    activeContentIds: snapshot.activeContentIds ?? [],
    liveContent: snapshot.liveContent ?? null,
    contentResponses: snapshot.contentResponses ?? [],
    anonymousMessages: snapshot.anonymousMessages ?? [],
    announcements: snapshot.announcements ?? [],
    rotationInstruction: snapshot.rotationInstruction ?? null
  };
}

function validateBackfillSnapshot(snapshot: SessionSnapshot) {
  const participantIds = new Set<string>();
  for (const participant of snapshot.participants) {
    if (participant.sessionId !== snapshot.session.id) {
      throw new Error(
        `participant ${participant.id} is linked to ${participant.sessionId}, expected ${snapshot.session.id}`
      );
    }

    if (participantIds.has(participant.id)) {
      throw new Error(`duplicate participant id detected: ${participant.id}`);
    }

    participantIds.add(participant.id);
  }
}

async function loadDbRepository() {
  const module = await import("../lib/repositories/db-repository.ts");
  return module.createDbAuthorityRepository();
}

export async function collectSnapshotFiles(targetPath: string): Promise<string[]> {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) {
    return [targetPath];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const collected = await Promise.all(
    entries.map((entry) =>
      collectSnapshotFiles(path.join(targetPath, entry.name)).catch(() => [])
    )
  );

  return collected
    .flat()
    .filter((filePath) => path.basename(filePath).toLowerCase() === "session.json");
}

function parseArgs(argv: string[]) {
  const args = new Set(argv.slice(2));
  const dryRun = args.has("--dry-run");
  const rootArg = argv.slice(2).find((arg) => !arg.startsWith("--"));

  return {
    dryRun,
    rootPath: rootArg ? path.resolve(rootArg) : path.join(process.cwd(), ".mingle-data")
  };
}

type PreparedSnapshot = {
  snapshotFile: string;
  snapshot: SessionSnapshot;
};

async function prepareSnapshots(snapshotFiles: string[]) {
  const prepared: PreparedSnapshot[] = [];
  const failures: BackfillSessionResult[] = [];

  for (const snapshotFile of snapshotFiles) {
    try {
      const raw = await readFile(snapshotFile, "utf8");
      const normalizedSnapshot = normalizeSnapshotForBackfill(
        JSON.parse(raw) as SessionSnapshot
      );
      validateBackfillSnapshot(normalizedSnapshot);
      prepared.push({
        snapshotFile,
        snapshot: normalizedSnapshot
      });
    } catch (error) {
      failures.push({
        snapshotFile,
        sessionId: null,
        status: "failure",
        dryRun: true,
        message: error instanceof Error ? error.message : "invalid snapshot"
      });
    }
  }

  return { prepared, failures };
}

function detectDuplicates(prepared: PreparedSnapshot[]) {
  const filesBySession = new Map<string, string[]>();

  for (const item of prepared) {
    const existing = filesBySession.get(item.snapshot.session.id) ?? [];
    existing.push(item.snapshotFile);
    filesBySession.set(item.snapshot.session.id, existing);
  }

  return [...filesBySession.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([sessionId, files]) => ({
      sessionId,
      files
    }));
}

export async function runAuthorityBackfill(options: BackfillOptions): Promise<BackfillReport> {
  const snapshotFiles = await collectSnapshotFiles(options.rootPath);
  if (!snapshotFiles.length) {
    throw new Error(`諛깊븘??session.json ?뚯씪??李얠? 紐삵뻽?듬땲?? root=${options.rootPath}`);
  }

  const repository =
    options.repository ?? (options.dryRun ? null : await loadDbRepository());
  const { prepared, failures: parseFailures } = await prepareSnapshots(snapshotFiles);
  const duplicates = detectDuplicates(prepared);
  const duplicateSessionIds = new Set(duplicates.map((item) => item.sessionId));
  const results: BackfillSessionResult[] = [...parseFailures];

  for (const item of prepared) {
    if (duplicateSessionIds.has(item.snapshot.session.id)) {
      results.push({
        snapshotFile: item.snapshotFile,
        sessionId: item.snapshot.session.id,
        status: "duplicate",
        dryRun: Boolean(options.dryRun),
        message: "duplicate session snapshot detected"
      });
      continue;
    }

    try {
      if (!options.dryRun) {
        if (!repository) {
          throw new Error("DB authority repository가 설정되지 않았습니다.");
        }
        await repository.upsertExistingSessionSnapshot(item.snapshot);
      }

      results.push({
        snapshotFile: item.snapshotFile,
        sessionId: item.snapshot.session.id,
        status: "success",
        dryRun: Boolean(options.dryRun)
      });
    } catch (error) {
      results.push({
        snapshotFile: item.snapshotFile,
        sessionId: item.snapshot.session.id,
        status: "failure",
        dryRun: Boolean(options.dryRun),
        message: error instanceof Error ? error.message : "backfill failed"
      });
    }
  }

  const report: BackfillReport = {
    rootPath: options.rootPath,
    dryRun: Boolean(options.dryRun),
    totalSessions: snapshotFiles.length,
    success: results.filter((result) => result.status === "success").length,
    failure: results.filter((result) => result.status !== "success").length,
    duplicates,
    results
  };

  for (const result of results) {
    logBackfillResult({
      status: result.status,
      snapshotFile: result.snapshotFile,
      sessionId: result.sessionId,
      dryRun: result.dryRun,
      message: result.message ?? null
    });
  }

  logBackfillResult({
    status: "completed",
    rootPath: report.rootPath,
    dryRun: report.dryRun,
    totalSessions: report.totalSessions,
    success: report.success,
    failure: report.failure,
    duplicates: report.duplicates.length
  });

  return report;
}

async function main() {
  const { dryRun, rootPath } = parseArgs(process.argv);
  await runAuthorityBackfill({
    rootPath,
    dryRun
  });
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(
      `[mingle-authority][authority-backfill-error] ${JSON.stringify({
        message: error instanceof Error ? error.message : "unknown backfill error"
      })}`
    );
    process.exitCode = 1;
  });
}
