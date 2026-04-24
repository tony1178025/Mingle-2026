import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEmptyCheckinDraft } from "@/lib/mingle";
import type {
  CheckinResolution,
  ExternalReservationSessionContext,
  ParticipantRecord,
  ProfileDraft,
  SessionSnapshot
} from "@/types/mingle";

const originalCwd = process.cwd();
const BRANCH_ID = "branch_seongsu";
const SESSION_ID = "session_simulation_2026_beta";
const TOTAL_PARTICIPANTS = 250;
const TOTAL_TABLES = 40;
const RUNS = 2;

function createBaseSnapshot(): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: SESSION_ID,
      name: "Internal Simulation Session",
      hqId: "hq_mingle",
      branchId: BRANCH_ID,
      branchName: "seongsu",
      eventId: "event_simulation_2026",
      venueName: "simulation venue",
      venueAddress: "simulation address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "simulation",
      attendanceHint: "internal simulation",
      code: "2026",
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date("2026-04-25T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-25T10:00:00.000Z").toISOString(),
      tableCount: TOTAL_TABLES,
      tableCapacity: 10,
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
    contactExchanges: [],
    announcements: [],
    rotationInstruction: null
  };
}

function createReservation(index: number): ExternalReservationSessionContext {
  const code = (1000 + index).toString().padStart(4, "0");
  const gender = index % 2 === 0 ? "M" : "F";
  return {
    sessionId: SESSION_ID,
    branchId: BRANCH_ID,
    reservationId: `reservation_${index.toString().padStart(4, "0")}`,
    reservationExternalId: `external_${index.toString().padStart(4, "0")}`,
    reservationLabel: `예약 ${index}`,
    checkinCode: code,
    phone: `010-${(2000 + (index % 8000)).toString().padStart(4, "0")}-${(3000 + (index % 7000))
      .toString()
      .padStart(4, "0")}`,
    gender,
    eligible: true,
    status: "ACTIVE"
  };
}

function createProfileDraft(index: number): ProfileDraft {
  const isEven = index % 2 === 0;
  const surname = isEven ? "김" : "이";
  const name = isEven ? "민" : "지";
  const suffix = (index % 100).toString().padStart(2, "0");
  return {
    nickname: `${surname}${name}${suffix}`,
    age: "29",
    jobCategory: "IT",
    job: "Engineer",
    photoUrl: "",
    heightCm: "175",
    animalType: "cat",
    energyType: isEven ? "E" : "I"
  };
}

function createQrDraft(index: number, tableId: number) {
  const code = (1000 + index).toString().padStart(4, "0");
  return {
    ...createEmptyCheckinDraft(),
    value: `mingle://table/${BRANCH_ID}/${tableId}?code=${code}`
  };
}

async function bootRepository(snapshot: SessionSnapshot, reservations: ExternalReservationSessionContext[]) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-simulation-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(
    path.join(tempDir, ".mingle-data", "reservations.json"),
    JSON.stringify(reservations, null, 2),
    "utf8"
  );
  vi.resetModules();
  const repository = await import("@/lib/repositories/server-repository");
  return { tempDir, repository };
}

function assertSnapshotConsistency(snapshot: SessionSnapshot) {
  const ids = snapshot.participants.map((participant) => participant.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const participant of snapshot.participants) {
    expect(participant.tableId).toBeGreaterThanOrEqual(1);
    expect(participant.tableId).toBeLessThanOrEqual(snapshot.session.tableCount);
  }
  expect(snapshot.participantStatusMap).toBeDefined();
  expect(snapshot.contactExchangeStats).toBeDefined();
}

describe("internal real-event simulation", () => {
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

  it(
    "runs sequential scenario repeatedly without invalid state",
    async () => {
      for (let run = 1; run <= RUNS; run += 1) {
        const reservations = Array.from({ length: TOTAL_PARTICIPANTS }, (_, index) =>
          createReservation(index + 1)
        );
        const { tempDir, repository } = await bootRepository(createBaseSnapshot(), reservations);
        tempDirs.push(tempDir);

        let latestSnapshot = await repository.getServerSessionSnapshot();
        let latestVersion = latestSnapshot.version;

        const participantIds: string[] = [];
        for (let index = 1; index <= TOTAL_PARTICIPANTS; index += 1) {
          const tableId = ((index - 1) % TOTAL_TABLES) + 1;
          const verifyResult = await repository.executeServerCommand({
            type: "customer.verifyCheckin",
            draft: createQrDraft(index, tableId),
            participantId: null
          });
          const resolution = verifyResult.checkinResolution as CheckinResolution;
          expect(resolution.flowState).toBe("SUCCESS");

          const completeResult = await repository.executeServerCommand({
            type: "customer.completeProfile",
            resolution,
            checkinMode: "qr",
            draft: createProfileDraft(index)
          });

          latestSnapshot = completeResult.snapshot;
          latestVersion = completeResult.snapshot.version;
          participantIds.push(completeResult.participantId ?? "");
        }

        expect(latestSnapshot.participants.length).toBe(TOTAL_PARTICIPANTS);
        assertSnapshotConsistency(latestSnapshot);

        const movableIds = participantIds.slice(0, 20);
        for (let index = 0; index < movableIds.length; index += 1) {
          const participantId = movableIds[index]!;
          const current = latestSnapshot.participants.find((participant) => participant.id === participantId);
          const toTableId = ((index + 7) % TOTAL_TABLES) + 1;
          const moveResult = await repository.executeServerCommand({
            type: "admin.moveParticipant",
            participantId,
            toTableId: toTableId === current?.tableId ? ((toTableId % TOTAL_TABLES) + 1) : toTableId,
            expectedVersion: latestVersion
          });
          latestSnapshot = moveResult.snapshot;
          latestVersion = moveResult.snapshot.version;
        }

        let stateResult = await repository.executeServerCommand({
          type: "admin.setSessionState",
          state: "BREAK",
          expectedVersion: latestVersion
        });
        latestSnapshot = stateResult.snapshot;
        latestVersion = stateResult.snapshot.version;

        stateResult = await repository.executeServerCommand({
          type: "admin.setSessionState",
          state: "ROUND_2",
          expectedVersion: latestVersion
        });
        latestSnapshot = stateResult.snapshot;
        latestVersion = stateResult.snapshot.version;

        for (let index = 0; index < 60; index += 1) {
          const sender = participantIds[index]!;
          const recipient = participantIds[(index + 30) % participantIds.length]!;
          const sendResult = await repository.executeServerCommand({
            type: "customer.sendHeart",
            participantId: sender,
            recipientId: recipient
          });
          latestSnapshot = sendResult.snapshot;
          latestVersion = sendResult.snapshot.version;
        }

        for (let pair = 0; pair < 8; pair += 1) {
          const a = participantIds[pair * 2]!;
          const b = participantIds[pair * 2 + 1]!;
          let sendResult = await repository.executeServerCommand({
            type: "customer.sendHeart",
            participantId: a,
            recipientId: b
          });
          latestSnapshot = sendResult.snapshot;
          latestVersion = sendResult.snapshot.version;

          sendResult = await repository.executeServerCommand({
            type: "customer.sendHeart",
            participantId: b,
            recipientId: a
          });
          latestSnapshot = sendResult.snapshot;
          latestVersion = sendResult.snapshot.version;
        }

        const revealResult = await repository.executeServerCommand({
          type: "admin.triggerReveal",
          expectedVersion: latestVersion
        });
        latestSnapshot = revealResult.snapshot;
        latestVersion = revealResult.snapshot.version;
        expect(latestSnapshot.session.revealSenders).toBe(true);

        const a = participantIds[0]!;
        const b = participantIds[1]!;
        let exchangeResult = await repository.executeServerCommand({
          type: "customer.submitContactExchangeConsent",
          participantId: a,
          targetParticipantId: b,
          consent: true,
          methods: { phone: "010-1111-0000" }
        });
        latestSnapshot = exchangeResult.snapshot;
        latestVersion = exchangeResult.snapshot.version;

        exchangeResult = await repository.executeServerCommand({
          type: "customer.submitContactExchangeConsent",
          participantId: b,
          targetParticipantId: a,
          consent: true,
          methods: { kakaoId: "beta_contact_01" }
        });
        latestSnapshot = exchangeResult.snapshot;
        latestVersion = exchangeResult.snapshot.version;

        const completedExchange = (latestSnapshot.contactExchanges ?? []).find(
          (item) =>
            (item.participantAId === a && item.participantBId === b) ||
            (item.participantAId === b && item.participantBId === a)
        );
        expect(completedExchange?.status).toBe("COMPLETED");

        const blockResult = await repository.executeServerCommand({
          type: "admin.setBlacklistStatus",
          participantId: b,
          blocked: true,
          reason: "simulation_block",
          expectedVersion: latestVersion
        });
        latestSnapshot = blockResult.snapshot;
        latestVersion = blockResult.snapshot.version;

        const blockedExchange = (latestSnapshot.contactExchanges ?? []).find(
          (item) =>
            (item.participantAId === a && item.participantBId === b) ||
            (item.participantAId === b && item.participantBId === a)
        );
        expect(blockedExchange?.status).toBe("BLOCKED");

        const closedResult = await repository.executeServerCommand({
          type: "admin.setSessionState",
          state: "CLOSED",
          expectedVersion: latestVersion
        });
        latestSnapshot = closedResult.snapshot;
        expect(latestSnapshot.session.phase).toBe("CLOSED");

        await expect(
          repository.executeServerCommand({
            type: "admin.moveParticipant",
            participantId: participantIds[2]!,
            toTableId: 1,
            expectedVersion: latestSnapshot.version
          })
        ).rejects.toThrow("세션이 종료되었습니다.");

        assertSnapshotConsistency(latestSnapshot);
      }
    },
    240000
  );
});
