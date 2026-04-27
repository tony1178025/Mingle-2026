import type { ContentTemplateRecord, SessionPhase } from "@/types/mingle";

export const CONTENT_LIBRARY: readonly ContentTemplateRecord[] = [
  {
    id: "warmup-prompt",
    kind: "prompt",
    title: "테이블 워밍업 질문",
    description: "지금 테이블에서 가장 가볍게 꺼낼 수 있는 질문 하나를 던져 보세요.",
    ctaLabel: "질문 시작했어요",
    phasePolicy: "ROUND_1",
    scope: "TABLE",
    durationSec: 180
  },
  {
    id: "reconnect-vote",
    kind: "vote",
    title: "다시 이야기하고 싶은 사람 투표",
    description: "오늘 다시 이어보고 싶은 타입을 하나 선택해 주세요.",
    ctaLabel: "투표 완료",
    phasePolicy: "ROUND_2",
    scope: "ALL",
    durationSec: 180,
    options: ["대화가 편했던 사람", "웃음이 잘 통했던 사람", "더 궁금한 사람"]
  },
  {
    id: "anonymous-note",
    kind: "anonymous",
    title: "익명 한마디",
    description: "최근 만난 사람에게 짧은 응원이나 인상을 익명으로 보낼 수 있습니다.",
    ctaLabel: "익명으로 보내기",
    phasePolicy: "ROUND_2",
    scope: "ALL",
    durationSec: 240,
    allowMessage: true,
    allowTargetSelection: true
  },
  {
    id: "table-impression-pick",
    kind: "table_impression_pick",
    title: "테이블 픽",
    description: "같은 테이블에서 선택해주세요",
    ctaLabel: "제출",
    phasePolicy: "ROUND_1",
    scope: "TABLE",
    durationSec: 600,
    allowTargetSelection: true
  },
  {
    id: "operator-announcement",
    kind: "announcement",
    title: "운영 공지",
    description: "현장 운영 메시지를 바로 확인하세요.",
    ctaLabel: "확인했어요",
    phasePolicy: "ALL",
    scope: "ALL",
    durationSec: 300,
    allowMessage: true
  },
  {
    id: "engagement-nudge",
    kind: "nudge",
    title: "분위기 끌어올리기",
    description: "지금 테이블에서 가장 먼저 말을 걸 사람을 떠올려 보세요.",
    ctaLabel: "바로 해볼게요",
    phasePolicy: "ALL",
    scope: "TABLE",
    durationSec: 120
  }
] as const;

export function isTemplateAllowedInPhase(phasePolicy: ContentTemplateRecord["phasePolicy"], phase: SessionPhase) {
  if (phasePolicy === "ALL") {
    return phase === "ROUND_1" || phase === "ROUND_2";
  }

  return phase === phasePolicy;
}

export function getContentTemplate(templateId: string) {
  return CONTENT_LIBRARY.find((item) => item.id === templateId) ?? null;
}
