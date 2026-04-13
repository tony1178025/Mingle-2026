export type WebVitalName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
export type WebVitalRating = "good" | "needs-improvement" | "poor";

type BudgetThreshold = {
  good: number;
  needsImprovement: number;
  unit: "ms" | "score";
  description: string;
};

export const WEB_VITAL_BUDGETS: Record<WebVitalName, BudgetThreshold> = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    unit: "ms",
    description: "첫 의미 있는 장면이 너무 늦게 열리면 프리미엄 인상이 빠르게 무너집니다."
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    unit: "score",
    description: "체크인과 탐색 화면에서 레이아웃 점프가 없어야 신뢰가 유지됩니다."
  },
  INP: {
    good: 200,
    needsImprovement: 500,
    unit: "ms",
    description: "탭 전환, 하트 전송, 운영 토글은 눌렀을 때 즉시 반응해야 합니다."
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    unit: "ms",
    description: "첫 화면이 너무 늦게 켜지면 현장 체크인 흐름이 끊깁니다."
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    unit: "ms",
    description: "초기 응답 지연은 운영 페이지 신뢰도를 바로 깎아먹습니다."
  }
};

export function classifyWebVital(name: WebVitalName, value: number): WebVitalRating {
  const budget = WEB_VITAL_BUDGETS[name];

  if (value <= budget.good) {
    return "good";
  }

  if (value <= budget.needsImprovement) {
    return "needs-improvement";
  }

  return "poor";
}

export function formatWebVitalValue(name: WebVitalName, value: number) {
  const budget = WEB_VITAL_BUDGETS[name];

  if (budget.unit === "score") {
    return value.toFixed(3);
  }

  return `${Math.round(value)}ms`;
}

export function getWebVitalHint(name: WebVitalName, rating: WebVitalRating) {
  const budget = WEB_VITAL_BUDGETS[name];

  if (rating === "good") {
    return `${name}가 목표 범위 안에 있습니다. ${budget.description}`;
  }

  if (rating === "needs-improvement") {
    return `${name}가 경계 구간입니다. ${budget.description}`;
  }

  return `${name}가 임계치를 넘었습니다. ${budget.description}`;
}
