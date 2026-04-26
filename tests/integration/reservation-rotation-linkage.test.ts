import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { createSeedSnapshot } from "@/lib/mingle";
import type { CheckinResolution, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();

async function bootRepository(snapshot: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-linkage-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  return tempDir;
}

describe("reservation persistence and rotation linkage", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = "linkage-test-secret";
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.resetModules();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  it("persists reservation imports idempotently and links check-in + rotation apply", async () => {
    const tempDir = await bootRepository(createSeedSnapshot());
    tempDirs.push(tempDir);
    const repository = await import("@/lib/repositories/server-repository");
    const currentRoute = await import("@/app/api/session/current/route");

    let snapshot: SessionSnapshot = await repository.getServerSessionSnapshot();

    const importRows = [
      {
        source: "CSV" as const,
        sessionId: snapshot.session.id,
        branchId: snapshot.session.branchId,
        eventId: snapshot.session.eventId,
        eventDate: "2026-04-26",
        reservationId: "resv-001",
        reservationExternalId: "naver-001",
        slot: "1부" as const,
        name: "링크고객",
        phone: "010-1111-2222",
        normalizedPhone: "01011112222",
        gender: "F" as const,
        birthYear: 1996,
        age: 30,
        paymentStatus: "확정",
        reservationStatus: "확정",
        checkinStatus: "PENDING" as const,
        memo: "테스트 예약",
        rawRow: { source: "test" },
        importedAt: new Date().toISOString(),
        status: "CONFIRMED" as const,
        eligible: true
      }
    ];

    const importResult = await repository.executeServerCommand({
      type: "admin.importReservations",
      rows: importRows,
      expectedVersion: snapshot.version
    });
    snapshot = importResult.snapshot;
    expect(snapshot.reservations?.length).toBe(1);

    const importAgain = await repository.executeServerCommand({
      type: "admin.importReservations",
      rows: importRows
    });
    snapshot = importAgain.snapshot;
    expect(snapshot.reservations?.length).toBe(1);

    const context = await repository.getReservationSessionContext({
      branchId: snapshot.session.branchId,
      tableId: 1
    });
    const resolution = context.checkinResolution as CheckinResolution;

    const complete = await repository.executeServerCommand({
      type: "customer.completeProfile",
      resolution,
      checkinMode: "qr",
      draft: {
        nickname: "링크고객",
        age: "30",
        jobCategory: "기획",
        job: "서비스",
        photoUrl: "",
        heightCm: "168",
        animalType: "강아지상",
        energyType: "E",
        contact: "010-1111-2222"
      }
    });
    snapshot = complete.snapshot;
    const linked = snapshot.participants.find((item) => item.id === complete.participantId);
    expect(linked?.reservationId).toBe("resv-001");
    expect(snapshot.reservations?.[0]?.checkinStatus).toBe("CHECKED_IN");

    const toBreak = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "BREAK",
      expectedVersion: snapshot.version
    });
    const toRound2 = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "ROUND_2",
      expectedVersion: toBreak.snapshot.version
    });
    snapshot = toRound2.snapshot;

    const previewResult = await repository.executeServerCommand({
      type: "admin.generateRotationPreview",
      expectedVersion: snapshot.version
    });
    expect((previewResult.rotationPreview?.tablePreviews ?? []).length).toBeGreaterThan(0);
    const beforeTableById = new Map(snapshot.participants.map((participant) => [participant.id, participant.tableId]));
    const applyResult = await repository.executeServerCommand({
      type: "admin.applyRotation",
      preview: previewResult.rotationPreview!,
      expectedVersion: previewResult.snapshot.version
    });
    snapshot = applyResult.snapshot;

    const moved = snapshot.participants.some(
      (participant) => beforeTableById.get(participant.id) !== participant.tableId
    );
    if ((previewResult.rotationPreview?.moves.length ?? 0) > 0) {
      expect(moved).toBe(true);
    }
    expect(snapshot.seatingAssignments.some((item) => item.assignmentSource === "ROTATION_APPLY")).toBe(true);
    expect(snapshot.auditLogs.some((log) => log.action === "ROTATION_APPLIED")).toBe(true);

    const customerCurrent = await currentRoute.GET(new NextRequest("http://localhost/api/session/current"));
    const customerPayload = (await customerCurrent.json()) as { data: Record<string, unknown> };
    expect(customerPayload.data).not.toHaveProperty("reservations");
    expect(customerPayload.data).not.toHaveProperty("auditLogs");
  });
});

