import { createSeedSnapshot } from "@/lib/mingle";
import { selectCurrentParticipant, useMingleStore } from "@/stores/useMingleStore";

describe("mingle store flows", () => {
  beforeEach(async () => {
    await useMingleStore.getState().resetDemo();
    await useMingleStore.getState().hydrate();
  });

  it("completes checkin, profile, preview, and apply flow", async () => {
    const store = useMingleStore.getState();
    store.updateCheckinMode("code");
    store.updateCheckinValue("2026");

    expect(await store.verifyCheckin()).toBe(true);

    store.updateProfileDraft("nickname", "현장테스트");
    store.updateProfileDraft("age", "29");
    store.updateProfileDraft("jobCategory", "사업개발/기획");
    store.updateProfileDraft("job", "사업개발");
    store.updateProfileDraft("heightCm", "178");
    store.updateProfileDraft("animalType", "강아지상");
    store.updateProfileDraft("energyType", "E");

    await store.completeProfile();

    const currentParticipant = selectCurrentParticipant(useMingleStore.getState());
    expect(currentParticipant?.nickname).toBe("현장테스트");

    await store.setPhase("ROUND_2");
    await store.toggleRevealSenders(true);
    await store.generateRotationPreview();

    expect(useMingleStore.getState().rotationPreview).not.toBeNull();

    await store.applyRotationPreview();

    expect(useMingleStore.getState().rotationPreview).toBeNull();
    expect(useMingleStore.getState().snapshot?.auditLogs[0]?.action).toBe("ROTATION_APPLIED");
  });

  it("sends a free heart and records the transaction", async () => {
    const store = useMingleStore.getState();
    useMingleStore.setState({
      snapshot: createSeedSnapshot(),
      viewerParticipantId: "m_03"
    });

    const ok = await store.sendHeart("f_05");
    expect(ok).toBe(true);
    expect(useMingleStore.getState().snapshot?.hearts[0]?.recipientId).toBe("f_05");
  });

  it("rejects profile completion when age/height are out of policy range", async () => {
    const store = useMingleStore.getState();
    store.updateCheckinMode("code");
    store.updateCheckinValue("2026");
    expect(await store.verifyCheckin()).toBe(true);

    store.updateProfileDraft("nickname", "범위테스트");
    store.updateProfileDraft("age", "19");
    store.updateProfileDraft("jobCategory", "사업개발/기획");
    store.updateProfileDraft("job", "사업개발");
    store.updateProfileDraft("heightCm", "178");
    store.updateProfileDraft("animalType", "강아지상");
    store.updateProfileDraft("energyType", "E");
    expect(await store.completeProfile()).toBe(false);

    store.updateProfileDraft("age", "29");
    store.updateProfileDraft("heightCm", "230");
    expect(await store.completeProfile()).toBe(false);
  });
});
