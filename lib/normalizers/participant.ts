import type { ParticipantRecord } from "@/types/mingle";

export function normalizeKeywordList(value: string) {
  return value
    .split("|")
    .flatMap((group) => group.split(":")[1]?.split(",") ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeJobLabel(job: string) {
  return job.trim() || "미입력";
}

export function normalizeParticipant(participant: ParticipantRecord): ParticipantRecord {
  return {
    ...participant,
    nickname: participant.nickname.trim() || "참가자",
    job: normalizeJobLabel(participant.job),
    animalType: participant.animalType.trim() || "미입력"
  };
}
