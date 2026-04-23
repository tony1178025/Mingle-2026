import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeedSnapshot } from "@/lib/mingle";
import { runAuthorityBackfill } from "@/scripts/backfill-db-authority";
import type { SessionSnapshot } from "@/types/mingle";

function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SessionSnapshot;
}

async function writeSnapshotFile(rootPath: string, folderName: string, snapshot: SessionSnapshot) {
  const targetDir = path.join(rootPath, folderName);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "session.json"), JSON.stringify(snapshot, null, 2), "utf8");
}

describe("db authority backfill script", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (tempDirs.length) {
      const tempDir = tempDirs.pop();
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("supports dry-run validation and detects duplicate session snapshots", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-backfill-"));
    tempDirs.push(tempDir);

    const snapshot = createSeedSnapshot();
    await writeSnapshotFile(tempDir, "session-a", cloneSnapshot(snapshot));
    await writeSnapshotFile(tempDir, "session-b", cloneSnapshot(snapshot));

    const repository = {
      upsertExistingSessionSnapshot: vi.fn(async (nextSnapshot: SessionSnapshot) => nextSnapshot)
    };

    const report = await runAuthorityBackfill({
      rootPath: tempDir,
      dryRun: true,
      repository
    });

    expect(report.dryRun).toBe(true);
    expect(report.totalSessions).toBe(2);
    expect(report.success).toBe(0);
    expect(report.failure).toBe(2);
    expect(report.duplicates).toHaveLength(1);
    expect(report.duplicates[0]?.sessionId).toBe(snapshot.session.id);
    expect(repository.upsertExistingSessionSnapshot).not.toHaveBeenCalled();
  });
});
