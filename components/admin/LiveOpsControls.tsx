"use client";

import { useState } from "react";
import { Button, MetricCard, SectionHeader, Surface } from "@/components/shared/ui";
import type { SessionPhase, SessionSnapshot } from "@/types/mingle";

const PHASES: SessionPhase[] = ["CHECKIN", "ROUND_1", "ROUND_2", "MATCH_END"];

export function LiveOpsControls({
  snapshot,
  revealReadyCount,
  onSetPhase,
  onToggleReveal,
  onPublishAnnouncement
}: {
  snapshot: SessionSnapshot;
  revealReadyCount: number;
  onSetPhase: (phase: SessionPhase) => Promise<void>;
  onToggleReveal: (value: boolean) => Promise<void>;
  onPublishAnnouncement: (message: string) => Promise<void>;
}) {
  const [announcement, setAnnouncement] = useState("");

  return (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="LIVE OPS"
          title="운영 제어"
          description="단계 전환, 공개, 공지 발행만 빠르게 처리합니다."
          actions={
            <Button
              variant={snapshot.session.revealSenders ? "danger" : "secondary"}
              onClick={() => void onToggleReveal(!snapshot.session.revealSenders)}
              data-testid="admin-reveal-toggle"
            >
              {snapshot.session.revealSenders ? "공개 닫기" : "공개 열기"}
            </Button>
          }
        />
        <div className="button-row wrap-row">
          {PHASES.map((phase) => (
            <Button
              key={phase}
              variant={snapshot.session.phase === phase ? "primary" : "ghost"}
              onClick={() => void onSetPhase(phase)}
              data-testid={`admin-phase-${phase.toLowerCase()}`}
            >
              {phase}
            </Button>
          ))}
        </div>
      </Surface>

      <div className="metric-grid">
        <MetricCard label="참가 인원" value={snapshot.participants.length} hint="현재 세션 기준 참여 인원" accent />
        <MetricCard label="공개 대기" value={revealReadyCount} hint="하트를 받은 인원" />
        <MetricCard
          label="신고 대기"
          value={snapshot.reports.filter((report) => report.status !== "RESOLVED").length}
          hint="즉시 처리해야 할 안전 이슈"
        />
      </div>

      <Surface>
        <SectionHeader
          eyebrow="ANNOUNCEMENT"
          title="현장 공지 발행"
          description="고객은 테이블 카드에서 공지를 바로 확인합니다."
        />
        <label className="field">
          <span>공지 메시지</span>
          <textarea rows={3} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} />
        </label>
        <Button
          block
          onClick={async () => {
            await onPublishAnnouncement(announcement);
            setAnnouncement("");
          }}
          disabled={!announcement.trim()}
        >
          공지 발행
        </Button>
      </Surface>
    </div>
  );
}
