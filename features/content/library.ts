import type { SessionPhase } from "@/types/mingle";

export type ContentPrimitive = "prompt" | "poll" | "card" | "vote";
export type ContentActivation = "all" | "round1-only" | "post-rotation" | "round2-only";

export type ContentItem = {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  primitive: ContentPrimitive;
  activation: ContentActivation;
};

export const CONTENT_LIBRARY: readonly ContentItem[] = [
  {
    id: "question-cards",
    title: "질문 카드",
    subtitle: "첫 10분의 공기를 자연스럽게 여는 테이블 전용 카드",
    detail: "게임보다 가볍고, 자기소개보다 덜 부담스럽게 테이블의 첫 리듬을 올려 줍니다.",
    primitive: "card",
    activation: "round1-only"
  },
  {
    id: "table-pairing",
    title: "테이블 페어링",
    subtitle: "과하지 않게 시선을 맞추게 하는 운영형 미션",
    detail: "짧은 질문과 선택형 미션으로 테이블 간 분위기를 부드럽게 이어 줍니다.",
    primitive: "prompt",
    activation: "post-rotation"
  },
  {
    id: "balance-pick",
    title: "밸런스 픽",
    subtitle: "취향이 달라도 분위기가 깨지지 않는 미니 콘텐츠",
    detail: "짧은 선택만으로도 서로의 방향감과 리듬을 자연스럽게 확인할 수 있습니다.",
    primitive: "poll",
    activation: "round2-only"
  }
] as const;

export function isContentEligibleForPhase(
  activation: ContentActivation,
  phase: SessionPhase
) {
  if (activation === "all") return phase !== "CHECKIN" && phase !== "MATCH_END";
  if (activation === "round1-only") return phase === "ROUND_1";
  if (activation === "post-rotation") return phase === "ROUND_2";
  return phase === "ROUND_2";
}

export function buildActiveContentView(contentIds: string[], phase: SessionPhase) {
  const activeSet = new Set(contentIds);
  return CONTENT_LIBRARY.map((item) => ({
    ...item,
    isAdminActivated: activeSet.has(item.id),
    isPhaseEligible: isContentEligibleForPhase(item.activation, phase)
  }));
}
