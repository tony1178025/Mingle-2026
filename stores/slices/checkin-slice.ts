import {
  createAuditLog,
  createEmptyCheckinDraft,
  createEmptyProfileDraft,
  createId,
  createToast,
  PROFILE_RULES,
  selectLeastCrowdedTable,
  setViewerParticipantId
} from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { validateCheckinDraft } from "@/features/checkin/model";
import { normalizeSnapshot } from "@/stores/helpers";
import type { CheckinSlice, StoreSlice } from "@/stores/types";

export const createCheckinSlice: StoreSlice<CheckinSlice> = (set, get) => ({
  checkinDraft: createEmptyCheckinDraft(),
  profileDraft: createEmptyProfileDraft(),

  updateCheckinMode(mode) {
    set({
      checkinDraft: {
        mode,
        value: "",
        staffNote: "",
        isVerified: false,
        error: null,
        resolution: null
      }
    });
  },

  updateCheckinValue(value) {
    set((state) => ({
      checkinDraft: {
        ...state.checkinDraft,
        value,
        isVerified: false,
        error: null,
        resolution: null
      }
    }));
  },

  updateStaffNote(value) {
    set((state) => ({
      checkinDraft: {
        ...state.checkinDraft,
        staffNote: value,
        isVerified: false,
        error: null,
        resolution: null
      }
    }));
  },

  async verifyCheckin() {
    const nextDraft = validateCheckinDraft(get().checkinDraft);
    set({ checkinDraft: nextDraft });

    if (!nextDraft.isVerified) {
      return false;
    }

    const snapshot = get().snapshot;
    if (!snapshot) return false;

    const audit = createAuditLog(
      "CHECKIN_VERIFIED",
      "viewer_pending",
      "CUSTOMER",
      `${nextDraft.mode.toUpperCase()} 체크인이 검증되었습니다.`,
      {
        mode: nextDraft.mode,
        reservationId: nextDraft.resolution?.reservationId
      },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      auditLogs: [audit, ...snapshot.auditLogs],
      session: { ...snapshot.session, updatedAt: audit.createdAt }
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);

    set({
      snapshot: nextSnapshot,
      toast: createToast("success", "체크인이 확인됐습니다. 프로필만 마치면 바로 입장할 수 있어요.")
    });

    return true;
  },

  updateProfileDraft(field, value) {
    set((state) => ({
      profileDraft: {
        ...state.profileDraft,
        [field]: value
      }
    }));
  },

  async completeProfile() {
    const snapshot = get().snapshot;
    const { checkinDraft, profileDraft } = get();
    if (!snapshot || !checkinDraft.isVerified || !checkinDraft.resolution) {
      return false;
    }

    const numericAge = Number(profileDraft.age);
    const numericHeight = Number(profileDraft.heightCm);
    if (
      !profileDraft.nickname.trim() ||
      !profileDraft.age ||
      !profileDraft.jobCategory ||
      !profileDraft.job ||
      !profileDraft.heightCm ||
      !profileDraft.animalType ||
      !profileDraft.energyType
    ) {
      set({ toast: createToast("warning", "필수 프로필 항목을 모두 입력해 주세요.") });
      return false;
    }
    if (numericAge < PROFILE_RULES.minAge || numericAge > PROFILE_RULES.maxAge) {
      set({ toast: createToast("warning", `나이는 ${PROFILE_RULES.minAge}~${PROFILE_RULES.maxAge}세만 가능합니다.`) });
      return false;
    }
    if (numericHeight < PROFILE_RULES.minHeightCm || numericHeight > PROFILE_RULES.maxHeightCm) {
      set({
        toast: createToast(
          "warning",
          `키는 ${PROFILE_RULES.minHeightCm}~${PROFILE_RULES.maxHeightCm}cm 범위에서 입력해 주세요.`
        )
      });
      return false;
    }

    const viewerParticipantId = createId("viewer");
    const assignedTableId = selectLeastCrowdedTable(snapshot.participants);
    const createdAt = new Date().toISOString();

    const participant = {
      id: viewerParticipantId,
      reservationId: checkinDraft.resolution.reservationId,
      nickname: profileDraft.nickname.trim(),
      gender: checkinDraft.resolution.gender,
      age: numericAge,
      jobCategory: profileDraft.jobCategory,
      job: profileDraft.job,
      photoUrl: profileDraft.photoUrl || null,
      heightCm: numericHeight,
      animalType: profileDraft.animalType,
      energyType: profileDraft.energyType,
      checkinMode: checkinDraft.mode,
      tableId: assignedTableId,
      receivedHearts: 0,
      sentHearts: 0,
      profileViews: 0,
      usedFreeHearts: 0,
      paidHeartBalance: 0,
      purchasedBundles: 0,
      metParticipantIds: [],
      tier: "C" as const,
      subTier: "LOW" as const,
      score: 0,
      attractionScore: 0,
      engagementScore: 0,
      isVip: false,
      isHighValue: false,
      joinedAt: createdAt
    };

    const seatingAssignment = {
      id: createId("seat"),
      sessionId: snapshot.session.id,
      rotationRound: 0,
      participantId: participant.id,
      tableId: assignedTableId,
      assignedAt: createdAt,
      assignmentSource: "INITIAL" as const
    };

    const audit = createAuditLog(
      "PROFILE_COMPLETED",
      participant.id,
      "CUSTOMER",
      `${participant.nickname} 님이 세션에 입장했습니다.`,
      {
        tableId: assignedTableId,
        reservationId: participant.reservationId
      },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      participants: [...snapshot.participants, participant],
      seatingAssignments: [seatingAssignment, ...snapshot.seatingAssignments],
      auditLogs: [audit, ...snapshot.auditLogs],
      session: { ...snapshot.session, updatedAt: createdAt }
    });

    setViewerParticipantId(participant.id);
    await getMingleRepository().saveSessionSnapshot(nextSnapshot);

    set({
      snapshot: nextSnapshot,
      viewerParticipantId: participant.id,
      selectedTableId: assignedTableId,
      customerTab: "explore",
      checkinDraft: createEmptyCheckinDraft(),
      profileDraft: createEmptyProfileDraft(),
      toast: createToast("success", "세션 입장이 완료되었습니다.")
    });

    return true;
  }
});
