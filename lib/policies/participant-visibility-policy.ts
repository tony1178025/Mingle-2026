import { formatTableName } from "@/lib/mingle";
import type { CustomerParticipantView, ParticipantRecord, SessionPhase } from "@/types/mingle";

function baseCustomerParticipant(participant: ParticipantRecord): Omit<
  CustomerParticipantView,
  | "age"
  | "jobCategory"
  | "job"
  | "tableId"
  | "tableLabel"
  | "appearanceSummary"
  | "personalitySummary"
  | "preferenceSummary"
  | "heartStatus"
> {
  return {
    id: participant.id,
    sessionId: participant.sessionId,
    branchId: participant.branchId,
    nickname: participant.nickname,
    gender: participant.gender,
    profileImage: participant.photoUrl,
    photoUrl: participant.photoUrl,
    heightCm: participant.heightCm,
    animalType: participant.animalType,
    energyType: participant.energyType,
    round2Attendance: participant.round2Attendance,
    receivedHearts: participant.receivedHearts,
    sentHearts: participant.sentHearts,
    profileViews: participant.profileViews,
    heartsRemaining: participant.heartsRemaining,
    metParticipantIds: participant.metParticipantIds,
    encounterHistory: participant.encounterHistory,
    likedParticipantIds: participant.likedParticipantIds,
    likedByParticipantIds: participant.likedByParticipantIds,
    joinedAt: participant.joinedAt,
    lastActiveAt: participant.lastActiveAt
  };
}

export function serializeParticipantForRound1(participant: ParticipantRecord): CustomerParticipantView {
  return {
    id: participant.id,
    nickname: participant.nickname,
    profileImage: participant.photoUrl,
    tableLabel: formatTableName(participant.tableId),
    appearanceSummary: `${participant.heightCm}cm · ${participant.animalType}`,
    personalitySummary: participant.energyType === "E" ? "외향형(E)" : "내향형(I)",
    preferenceSummary:
      participant.round2Attendance === "YES"
        ? "2차 라운드 참석"
        : participant.round2Attendance === "NO"
          ? "2차 라운드 미참석"
          : "2차 라운드 미정",
    heartStatus: {
      heartsRemaining: participant.heartsRemaining
    }
  };
}

export function serializeParticipantForRound2(participant: ParticipantRecord): CustomerParticipantView {
  return {
    ...baseCustomerParticipant(participant),
    tableLabel: formatTableName(participant.tableId),
    appearanceSummary: `${participant.heightCm}cm · ${participant.animalType}`,
    personalitySummary: participant.energyType === "E" ? "외향형(E)" : "내향형(I)",
    preferenceSummary:
      participant.round2Attendance === "YES"
        ? "2차 라운드 참석"
        : participant.round2Attendance === "NO"
          ? "2차 라운드 미참석"
          : "2차 라운드 미정",
    heartStatus: {
      heartsRemaining: participant.heartsRemaining
    },
    age: participant.age,
    jobCategory: participant.jobCategory,
    job: participant.job
  };
}

export function serializeParticipantForCustomer(
  participant: ParticipantRecord,
  phase: SessionPhase
): CustomerParticipantView {
  if (phase === "ROUND_2") {
    return serializeParticipantForRound2(participant);
  }
  return serializeParticipantForRound1(participant);
}
