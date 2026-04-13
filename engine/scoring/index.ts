import { clamp } from "@/lib/mingle";
import type { ParticipantRecord } from "@/types/mingle";

export const SCORING_WEIGHTS = {
  attractionReceivedHearts: 5.2,
  attractionProfileViews: 1.35,
  attractionPaidHeartBalance: 1.1,
  engagementSentHearts: 3.1,
  engagementUsedFreeHearts: 2.4,
  finalAttraction: 0.56,
  finalEngagement: 0.44
} as const;

export interface ScoreBreakdown {
  attractionScore: number;
  engagementScore: number;
  finalScore: number;
}

export function calculateParticipantScore(participant: ParticipantRecord): ScoreBreakdown {
  const attractionScore =
    participant.receivedHearts * SCORING_WEIGHTS.attractionReceivedHearts +
    clamp(participant.profileViews, 0, 20) * SCORING_WEIGHTS.attractionProfileViews +
    participant.paidHeartBalance * SCORING_WEIGHTS.attractionPaidHeartBalance;

  const engagementScore =
    participant.sentHearts * SCORING_WEIGHTS.engagementSentHearts +
    clamp(participant.usedFreeHearts, 0, 3) * SCORING_WEIGHTS.engagementUsedFreeHearts;

  const finalScore =
    attractionScore * SCORING_WEIGHTS.finalAttraction +
    engagementScore * SCORING_WEIGHTS.finalEngagement;

  return {
    attractionScore: Number(attractionScore.toFixed(2)),
    engagementScore: Number(engagementScore.toFixed(2)),
    finalScore: Number(finalScore.toFixed(2))
  };
}
