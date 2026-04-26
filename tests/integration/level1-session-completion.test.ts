import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { createSeedSnapshot } from "@/lib/mingle";
import type { CheckinResolution, SessionSnapshot } from "@/types/mingle";

const originalCwd = process.cwd();

async function bootRepository(snapshot: SessionSnapshot) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mingle-level1-"));
  process.chdir(tempDir);
  await mkdir(path.join(tempDir, ".mingle-data"), { recursive: true });
  await writeFile(path.join(tempDir, ".mingle-data", "session.json"), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(path.join(tempDir, ".mingle-data", "reservations.json"), JSON.stringify([], null, 2), "utf8");
  vi.resetModules();
  return tempDir;
}

describe("level1 session completion guards", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    process.chdir(originalCwd);
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = "level1-test-secret";
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.resetModules();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  it("runs one full session with customer/admin boundary and close guard", async () => {
    const tempDir = await bootRepository(createSeedSnapshot());
    tempDirs.push(tempDir);

    const repository = await import("@/lib/repositories/server-repository");
    const currentRoute = await import("@/app/api/session/current/route");

    const initial = await repository.getServerSessionSnapshot();

    const ctxA = await repository.getReservationSessionContext({
      branchId: initial.session.branchId,
      tableId: 1
    });
    const resolutionA = ctxA.checkinResolution as CheckinResolution;
    expect(resolutionA.flowState).toBe("SUCCESS");

    const profileA = await repository.executeServerCommand({
      type: "customer.completeProfile",
      resolution: resolutionA,
      checkinMode: "qr",
      draft: {
        nickname: "고객A",
        age: "29",
        jobCategory: "기획",
        job: "서비스 기획",
        photoUrl: "",
        heightCm: "170",
        animalType: "강아지상",
        energyType: "E"
      }
    });
    const participantA = profileA.participantId!;
    expect(participantA).toBeTruthy();

    await expect(
      repository.executeServerCommand({
        type: "customer.completeProfile",
        resolution: resolutionA,
        checkinMode: "qr",
        draft: {
          nickname: "중복A",
          age: "29",
          jobCategory: "기획",
          job: "서비스 기획",
          photoUrl: "",
          heightCm: "170",
          animalType: "강아지상",
          energyType: "E"
        }
      })
    ).rejects.toThrow("이미 체크인된 예약입니다.");

    const ctxB = await repository.getReservationSessionContext({
      branchId: initial.session.branchId,
      tableId: 2
    });
    const resolutionB = ctxB.checkinResolution as CheckinResolution;
    const profileB = await repository.executeServerCommand({
      type: "customer.completeProfile",
      resolution: resolutionB,
      checkinMode: "qr",
      draft: {
        nickname: "고객B",
        age: "30",
        jobCategory: "개발",
        job: "프론트엔드",
        photoUrl: "",
        heightCm: "173",
        animalType: "고양이상",
        energyType: "I"
      }
    });
    const participantB = profileB.participantId!;

    let snapshot = profileB.snapshot;
    let version = snapshot.version;

    await expect(
      repository.executeServerCommand({
        type: "customer.submitContactExchangeConsent",
        participantId: participantA,
        targetParticipantId: participantB,
        consent: true,
        methods: { phone: "010-1111-2222" }
      })
    ).rejects.toThrow("하트 공개 이후에만 연락처 교환을 요청할 수 있습니다.");

    const sendHeart = await repository.executeServerCommand({
      type: "customer.sendHeart",
      participantId: participantA,
      recipientId: participantB
    });
    snapshot = sendHeart.snapshot;
    expect(snapshot.hearts.some((heart) => heart.senderId === participantA && heart.recipientId === participantB)).toBe(true);

    await expect(
      repository.executeServerCommand({
        type: "customer.sendHeart",
        participantId: participantA,
        recipientId: participantB
      })
    ).rejects.toThrow("같은 참가자에게는 한 번만 하트를 보낼 수 있습니다.");

    await expect(
      repository.executeServerCommand({
        type: "admin.triggerReveal",
        expectedVersion: snapshot.version
      })
    ).rejects.toThrow("하트 공개는 ROUND_2에서만 가능합니다.");

    const replyHeart = await repository.executeServerCommand({
      type: "customer.sendHeart",
      participantId: participantB,
      recipientId: participantA
    });
    version = replyHeart.snapshot.version;

    const toBreak = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "BREAK",
      expectedVersion: version
    });
    const toRound2 = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "ROUND_2",
      expectedVersion: toBreak.snapshot.version
    });
    const reveal = await repository.executeServerCommand({
      type: "admin.triggerReveal",
      expectedVersion: toRound2.snapshot.version
    });
    expect(reveal.snapshot.session.revealSenders).toBe(true);

    const contactA = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: participantA,
      targetParticipantId: participantB,
      consent: true,
      methods: { phone: "010-1111-2222" }
    });
    const contactB = await repository.executeServerCommand({
      type: "customer.submitContactExchangeConsent",
      participantId: participantB,
      targetParticipantId: participantA,
      consent: true,
      methods: { kakaoId: "customer-b" }
    });
    expect(contactB.snapshot.contactExchanges?.[0]?.status).toBe("COMPLETED");

    const report = await repository.executeServerCommand({
      type: "customer.submitReport",
      participantId: participantA,
      targetId: participantB,
      reason: "불쾌한 발언",
      details: "부적절한 발언이 반복되어 신고합니다."
    });
    expect(report.snapshot.reports.length).toBeGreaterThan(0);

    const blocked = await repository.executeServerCommand({
      type: "admin.setBlacklistStatus",
      participantId: participantB,
      blocked: true,
      reason: "운영자 판단"
    });
    expect((blocked.snapshot.blacklist ?? []).some((entry) => entry.participantId === participantB)).toBe(true);

    const customerCurrent = await currentRoute.GET(new NextRequest("http://localhost/api/session/current"));
    const customerPayload = (await customerCurrent.json()) as { data: Record<string, unknown> };
    expect(customerPayload.data).not.toHaveProperty("auditLogs");
    expect(customerPayload.data).not.toHaveProperty("blacklist");
    expect(customerPayload.data).not.toHaveProperty("reports");
    expect(customerPayload.data).not.toHaveProperty("incidents");

    const close = await repository.executeServerCommand({
      type: "admin.setSessionState",
      state: "CLOSED",
      expectedVersion: blocked.snapshot.version
    });
    expect(close.snapshot.session.phase).toBe("CLOSED");

    await expect(
      repository.executeServerCommand({
        type: "admin.moveParticipant",
        participantId: participantA,
        toTableId: 3,
        expectedVersion: close.snapshot.version
      })
    ).rejects.toThrow("세션이 종료되었습니다.");
  }, 60000);
});
