import { applyRotationPreview, generateRotationPreview } from "@/engine/rotation";
import { createAuditLog, createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { normalizeSnapshot } from "@/stores/helpers";
import type { AdminSlice, StoreSlice } from "@/stores/types";

export const createAdminSlice: StoreSlice<AdminSlice> = (set, get) => ({
  rotationPreview: null,

  async setPhase(phase) {
    const snapshot = get().snapshot;
    if (!snapshot || snapshot.session.phase === phase) return;

    const audit = createAuditLog(
      "PHASE_CHANGED",
      "admin",
      "ADMIN",
      `${phase} 단계로 전환했습니다.`,
      { phase },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      session: { ...snapshot.session, phase, updatedAt: audit.createdAt },
      auditLogs: [audit, ...snapshot.auditLogs]
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({
      snapshot: nextSnapshot,
      toast: createToast("success", "세션 단계를 변경했습니다.")
    });
  },

  async toggleRevealSenders(value) {
    const snapshot = get().snapshot;
    if (!snapshot || snapshot.session.revealSenders === value) return;

    const audit = createAuditLog(
      "REVEAL_TOGGLED",
      "admin",
      "ADMIN",
      value ? "보낸 사람 공개를 켰습니다." : "보낸 사람 공개를 껐습니다.",
      { revealSenders: value },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      session: {
        ...snapshot.session,
        revealSenders: value,
        revealTriggeredAt: value ? audit.createdAt : null,
        updatedAt: audit.createdAt
      },
      auditLogs: [audit, ...snapshot.auditLogs]
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({
      snapshot: nextSnapshot,
      toast: createToast(
        "success",
        value ? "보낸 사람 공개를 열었습니다." : "보낸 사람 공개를 닫았습니다."
      )
    });
  },

  async generateRotationPreview() {
    const snapshot = get().snapshot;
    if (!snapshot) return;

    const preview = generateRotationPreview(snapshot);
    set({
      adminPanel: "rotation",
      rotationPreview: preview,
      toast: createToast("info", "회전 미리보기를 생성했습니다.")
    });
  },

  async applyRotationPreview() {
    const snapshot = get().snapshot;
    const rotationPreview = get().rotationPreview;
    if (!snapshot || !rotationPreview) return;

    const nextSnapshot = normalizeSnapshot(applyRotationPreview(snapshot, rotationPreview));
    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({
      snapshot: nextSnapshot,
      rotationPreview: null,
      toast: createToast("success", "회전 미리보기를 실제 배치에 적용했습니다.")
    });
  }
});
