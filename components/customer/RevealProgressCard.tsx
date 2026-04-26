"use client";

import { SectionHeader, Surface } from "@/components/shared/ui";

export function RevealProgressCard({ heartsRemaining }: { heartsRemaining: number }) {
  return (
    <Surface className="reveal-progress-card hearts-status-card">
      <SectionHeader
        eyebrow="하트"
        title={`남은 하트 ${heartsRemaining}개`}
        description="추가 하트는 현장에서 운영자를 통해 지급됩니다."
      />
    </Surface>
  );
}
