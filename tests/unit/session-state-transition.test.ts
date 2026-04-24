import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SessionPhase, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();
const SESSION_ID = "session_state_test";
const BRANCH_ID = "branch_seongsu";

function makeSnapshot(phase: SessionPhase): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "State Test",
      hqId: "hq_mingle",
      branchId: BRANCH_ID,
      branchName: "seongsu",
      eventId: "event_test",
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "2",
      attendanceHint: "test",
      code: "2026",
      phase,
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableCount: 3,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants: [],
    hearts: [],
    reports: [],
    auditLogs: [],
    seatingAssignments: [],
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null
  };
}

async function bootRepository(snapshot: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-state-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(
    path.join(tempDir, ".mingle-data", "session.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(tempDir, ".mingle-data", "reservations.json"),
    JSON.stringify([], null, 2),
    "utf8"
  );
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

describe("admin.setSessionState", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.resetModules();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  it("allows valid transitions and increments snapshot version", async () => {
    const baseSnapshot = makeSnapshot("ROUND_1");
    const { tempDir, repository } = await bootRepository(baseSnapshot);
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "BREAK"
    });

    expect(result.snapshot.session.phase).toBe("BREAK");
    expect(result.snapshot.version).toBeGreaterThan(baseSnapshot.version);
  }, 30000);

  it("rejects invalid transitions", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot("ROUND_2"));
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.setSessionState",
        state: "BREAK"
      })
    ).rejects.toThrow();
  }, 30000);

  it("rejects same-state reapply", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot("ROUND_1"));
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.setSessionState",
        state: "ROUND_1"
      })
    ).rejects.toThrow();
  }, 30000);

  it("prevents any transition after CLOSED", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot("CLOSED"));
    tempDirs.push(tempDir);

    await expect(
      repository.executeServerCommand({
        type: "admin.setSessionState",
        state: "ROUND_2"
      })
    ).rejects.toThrow();
  }, 30000);

  it("records audit fields for transitions", async () => {
    const { tempDir, repository } = await bootRepository(makeSnapshot("BREAK"));
    tempDirs.push(tempDir);

    const result = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "ROUND_2"
    });

    const log = result.snapshot.auditLogs.find((entry) => entry.action === "SESSION_STATE_CHANGED");
    expect(log).toBeDefined();
    expect(log?.metadata?.changed_by).toBe("admin");
    expect(log?.metadata?.from_state).toBe("BREAK");
    expect(log?.metadata?.to_state).toBe("ROUND_2");
    expect(log?.metadata?.timestamp).toBeTypeOf("string");
  }, 30000);
});
