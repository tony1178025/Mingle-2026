import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildTableSummaries } from "@/engine/heat";
import { buildRevealState } from "@/engine/reveal";
import { createSeedSnapshot } from "@/lib/mingle";

const originalCwd = process.cwd();

async function bootRepository() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-paid-beta-smoke-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  const seed = createSeedSnapshot();
  await writeFile(
    path.join(tempDir, ".mingle-data", "session.json"),
    JSON.stringify(seed, null, 2),
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

describe("paid-beta smoke flow", () => {
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

  it("covers admin + customer core flow", async () => {
    const { tempDir, repository } = await bootRepository();
    tempDirs.push(tempDir);

    let result = await repository.getServerSessionSnapshot();
    expect(result.session.id).toBeTruthy();
    expect(result.participants.length).toBeGreaterThanOrEqual(30);
    expect(result.session.tableCount).toBeGreaterThanOrEqual(5);

    const tables = buildTableSummaries(
      result.participants,
      result.session.tableCount,
      result.session.tableCapacity,
      result.session.updatedAt,
      result.participantStatusMap ?? {}
    );
    expect(tables.length).toBe(result.session.tableCount);

    let commandResult = await repository.executeServerCommand({
      type: "admin.createManualParticipant",
      nickname: "현장등록A",
      gender: "F",
      tableId: 1,
      expectedVersion: result.version
    });
    const manualId = commandResult.participantId;
    expect(manualId).toBeTruthy();
    const targetTableId =
      Array.from({ length: commandResult.snapshot.session.tableCount }, (_, idx) => idx + 1).find(
        (tableId) =>
          commandResult.snapshot.participants.filter((participant) => participant.tableId === tableId).length <
          commandResult.snapshot.session.tableCapacity
      ) ?? commandResult.snapshot.session.tableCount;

    commandResult = await repository.executeServerCommand({
      type: "admin.moveParticipant",
      participantId: manualId!,
      toTableId: targetTableId,
      expectedVersion: commandResult.snapshot.version
    });
    expect(commandResult.snapshot.participants.find((p) => p.id === manualId)?.tableId).toBe(targetTableId);

    commandResult = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "BREAK",
      expectedVersion: commandResult.snapshot.version
    });
    commandResult = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "ROUND_2",
      expectedVersion: commandResult.snapshot.version
    });
    commandResult = await repository.executeServerCommand({
      type: "admin.triggerReveal",
      expectedVersion: commandResult.snapshot.version
    });

    const revealViewer = commandResult.snapshot.participants.find((p) => p.id === "f_02");
    const revealState = buildRevealState(
      commandResult.snapshot.session,
      revealViewer ?? null,
      commandResult.snapshot.hearts,
      commandResult.snapshot.participants
    );
    expect(revealState.status).toContain("남은 하트");

    commandResult = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: "m_03",
      targetParticipantId: "f_01",
      consent: true,
      methods: { phone: "010-0000-0001" }
    });
    const exchange = (commandResult.snapshot.contactExchanges ?? []).find(
      (item) =>
        (item.participantAId === "f_01" && item.participantBId === "m_03") ||
        (item.participantAId === "m_03" && item.participantBId === "f_01")
    );
    expect(exchange?.status).toBe("COMPLETED");

    commandResult = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "CLOSED",
      expectedVersion: commandResult.snapshot.version
    });

    await expect(
      repository.executeServerCommand({
        type: "admin.moveParticipant",
        participantId: manualId!,
        toTableId: 3,
        expectedVersion: commandResult.snapshot.version
      })
    ).rejects.toThrow("세션이 종료되었습니다.");
  }, 60000);
});
