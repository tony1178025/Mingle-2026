"use client";

import { useState } from "react";
import { Badge, Button, MetricCard, SectionHeader, Surface } from "@/components/shared/ui";
import type { SessionOperationalState, SessionSnapshot } from "@/types/mingle";

const SESSION_STATE_ACTIONS: Array<{ state: SessionOperationalState; label: string }> = [
  { state: "ROUND_1", label: "1라운드 시작" },
  { state: "BREAK", label: "휴식" },
  { state: "ROUND_2", label: "2라운드 시작" },
  { state: "CLOSED", label: "세션 종료" }
];

export function LiveOpsControls({
  snapshot,
  revealReadyCount,
  phaseLabel,
  onSetSessionState,
  onTriggerReveal,
  onPublishAnnouncement
}: {
  snapshot: SessionSnapshot;
  revealReadyCount: number;
  /** 한 줄로 현재 단계를 읽을 수 있게 표시 */
  phaseLabel: string;
  onSetSessionState: (state: SessionOperationalState) => Promise<void>;
  onTriggerReveal: () => Promise<void>;
  onPublishAnnouncement: (message: string) => Promise<void>;
}) {
  const [announcement, setAnnouncement] = useState("");

  return (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="라이브 운영"
          title="운영 제어"
          description="단계 전환 · 하트 공개 · 공지만 이 화면에서 처리합니다."
          actions={<Badge tone="neutral">{phaseLabel}</Badge>}
        />
        <div className="compact-row">
          <strong>단계</strong>
          <span>1라운드 → 휴식 → 2라운드 → 종료</span>
        </div>
        <div className="button-row wrap-row">
          {SESSION_STATE_ACTIONS.map((action) => (
            <Button
              key={action.state}
              variant={snapshot.session.phase === action.state ? "primary" : "ghost"}
              onClick={() => {
                const confirmed = window.confirm(
                  action.state === "CLOSED"
                    ? "세션을 종료하면 다시 열 수 없습니다. 전환할까요?"
                    : `${action.label}로 상태를 전환할까요?`
                );
                if (!confirmed) {
                  return;
                }
                void onSetSessionState(action.state);
              }}
              data-testid={`admin-state-${action.state.toLowerCase()}`}
            >
              {action.label}
            </Button>
          ))}
          {snapshot.session.phase === "ROUND_2" ? (
            <Button
              variant={snapshot.session.revealSenders ? "secondary" : "primary"}
              disabled={snapshot.session.revealSenders}
              onClick={() => {
                const confirmed = window.confirm("하트를 공개할까요?");
                if (!confirmed) {
                  return;
                }
                void onTriggerReveal();
              }}
              data-testid="admin-trigger-reveal"
            >
              {snapshot.session.revealSenders ? "하트 공개 완료" : "하트 공개"}
            </Button>
          ) : null}
        </div>
      </Surface>

      <div className="metric-grid">
        <MetricCard label="참가 인원" value={snapshot.participants.length} hint="이 세션에 등록된 인원" accent />
        <MetricCard label="공개 대기" value={revealReadyCount} hint="공개 전 하트 수신 인원" />
        <MetricCard
          label="신고 대기"
          value={snapshot.reports.filter((report) => report.status !== "RESOLVED").length}
          hint="처리 전 안전·운영 신고"
        />
      </div>

      <Surface>
        <SectionHeader
          eyebrow="공지"
          title="현장 공지 발행"
          description="고객 앱 상단·테이블 영역에 바로 반영됩니다."
        />
        <div className="compact-row">
          <strong>발행</strong>
          <span>문구 확인 후 발행</span>
        </div>
        <label className="field">
          <span>공지 메시지</span>
          <textarea rows={3} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} />
        </label>
        <Button
          block
          onClick={async () => {
            const confirmed = window.confirm("공지 노출은 고객 화면에 즉시 반영됩니다. 발행할까요?");
            if (!confirmed) {
              return;
            }
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
