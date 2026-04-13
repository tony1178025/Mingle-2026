import type { ParticipantRecord, TableSummary } from "@/types/mingle";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function estimateRevisitLikelihood(
  participant: ParticipantRecord,
  table: TableSummary | undefined
) {
  const engagement = participant.sentHearts * 7 + participant.receivedHearts * 8 + participant.profileViews * 1.2;
  const confidencePenalty = participant.receivedHearts === 0 ? 12 : 0;
  const repeatPenalty = (table?.repeatMeetings ?? 0) * 6;
  const coldPenalty = (table?.heat ?? 0) <= 10 ? 10 : 0;
  const protectedBonus = participant.isVip || participant.isHighValue ? 6 : 0;

  const rawScore = 48 + engagement - confidencePenalty - repeatPenalty - coldPenalty + protectedBonus;
  const score = clamp(Math.round(rawScore), 0, 100);
  const bucket = score >= 70 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";

  return { score, bucket };
}

