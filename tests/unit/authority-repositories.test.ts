import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSeedSnapshot } from "@/lib/mingle";
import { createDbAuthorityRepository, createMemoryDbAuthorityAdapter } from "@/lib/repositories/db-repository";
import { createFileAuthorityRepository } from "@/lib/repositories/file-repository";
import type { SessionSnapshot } from "@/types/mingle";

function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SessionSnapshot;
}

function createAuthoritySnapshot() {
  const snapshot = createSeedSnapshot();
  return {
    ...snapshot,
    version: 3,
    session: {
      ...snapshot.session,
      hqId: "hq_mingle",
      branchId: "branch_seongsu",
      eventId: "event_signature_20260412",
      customerSessionVersion: 4
    },
    participants: snapshot.participants.map((participant) => ({
      ...participant,
      sessionId: snapshot.session.id,
      branchId: snapshot.session.branchId
    })),
    blacklist: [
      {
        id: "blacklist_1",
        sessionId: snapshot.session.id,
        branchId: snapshot.session.branchId,
        participantId: snapshot.participants[0]!.id,
        reason: "운영 정책상 제한",
        createdAt: snapshot.session.updatedAt
      }
    ],
    incidents: [
      {
        id: "incident_1",
        sessionId: snapshot.session.id,
        branchId: snapshot.session.branchId,
        reporterId: snapshot.participants[0]!.id,
        targetId: snapshot.participants[1]?.id ?? null,
        type: "REPORT_SUBMITTED" as const,
        message: "Report submitted",
        timestamp: snapshot.session.updatedAt
      }
    ]
  };
}

describe("authority repositories", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (tempDirs.length) {
      const tempDir = tempDirs.pop();
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("keeps db authority aligned with file authority for branch/session-linked snapshots", async () => {
    const seedSnapshot = createAuthoritySnapshot();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-file-authority-"));
    tempDirs.push(tempDir);

    const fileRepository = createFileAuthorityRepository({
      dataDir: tempDir,
      createSnapshot: () => cloneSnapshot(seedSnapshot)
    });
    const dbAdapter = createMemoryDbAuthorityAdapter();
    const dbRepository = createDbAuthorityRepository({
      adapter: dbAdapter,
      createSnapshot: () => cloneSnapshot(seedSnapshot)
    });

    const fileSnapshot = await fileRepository.getSessionSnapshot();
    const dbSnapshot = await dbRepository.getSessionSnapshot();

    expect(dbSnapshot.session.hqId).toBe(fileSnapshot.session.hqId);
    expect(dbSnapshot.session.branchId).toBe(fileSnapshot.session.branchId);
    expect(dbSnapshot.session.eventId).toBe(fileSnapshot.session.eventId);
    expect(dbSnapshot.session.customerSessionVersion).toBe(
      fileSnapshot.session.customerSessionVersion
    );
    expect(
      dbSnapshot.participants.map((participant) => ({
        id: participant.id,
        sessionId: participant.sessionId,
        branchId: participant.branchId
      }))
    ).toEqual(
      fileSnapshot.participants.map((participant) => ({
        id: participant.id,
        sessionId: participant.sessionId,
        branchId: participant.branchId
      }))
    );

    const nextSnapshot = await dbRepository.persistSessionSnapshot({
      ...dbSnapshot,
      session: {
        ...dbSnapshot.session,
        customerSessionVersion: dbSnapshot.session.customerSessionVersion + 1
      }
    });
    const projection = dbAdapter.getProjection();

    expect(nextSnapshot.session.customerSessionVersion).toBe(5);
    expect(projection?.session.customer_session_version).toBe(5);
    expect(projection?.session.branch_id).toBe("branch_seongsu");
    expect(projection?.participants.every((participant) => participant.branch_id === "branch_seongsu")).toBe(true);
    expect(projection?.blacklist).toHaveLength(1);
    expect(projection?.incidents).toHaveLength(1);
  });
});
