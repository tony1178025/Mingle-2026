import { calculateParticipantScore } from "../scoring/index.ts";
import type {
  ParticipantRecord,
  ParticipantSubTier,
  ParticipantTier
} from "../../types/mingle.ts";

const TIER_RATIOS = {
  A: 0.2,
  B: 0.4
} as const;

function resolveSubTier(index: number, total: number): ParticipantSubTier {
  if (total <= 2) {
    return index === 0 ? "HIGH" : "MID";
  }

  const highCut = Math.max(1, Math.ceil(total * 0.34));
  const midCut = Math.max(highCut + 1, Math.ceil(total * 0.67));

  if (index < highCut) return "HIGH";
  if (index < midCut) return "MID";
  return "LOW";
}

export function classifyParticipants(participants: ParticipantRecord[]) {
  const ranked = [...participants]
    .map((participant) => {
      const scores = calculateParticipantScore(participant);
      return {
        ...participant,
        attractionScore: scores.attractionScore,
        engagementScore: scores.engagementScore,
        score: scores.finalScore
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.receivedHearts !== left.receivedHearts) return right.receivedHearts - left.receivedHearts;
      if (right.profileViews !== left.profileViews) return right.profileViews - left.profileViews;
      return left.id.localeCompare(right.id, "ko");
    });

  const aCut = Math.max(1, Math.ceil(ranked.length * TIER_RATIOS.A));
  const bCut = Math.max(aCut + 1, Math.ceil(ranked.length * (TIER_RATIOS.A + TIER_RATIOS.B)));

  const withTier = ranked.map((participant, index) => {
    const tier: ParticipantTier = index < aCut ? "A" : index < bCut ? "B" : "C";
    return { ...participant, tier };
  });

  return withTier.map((participant) => {
    const sameTier = withTier.filter((candidate) => candidate.tier === participant.tier);
    const tierIndex = sameTier.findIndex((candidate) => candidate.id === participant.id);
    return {
      ...participant,
      subTier: resolveSubTier(tierIndex, sameTier.length)
    };
  });
}
