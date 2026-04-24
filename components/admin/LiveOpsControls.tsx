"use client";

import { useState } from "react";
import { Button, MetricCard, SectionHeader, Surface } from "@/components/shared/ui";
import type { SessionOperationalState, SessionSnapshot } from "@/types/mingle";

const SESSION_STATE_ACTIONS: Array<{ state: SessionOperationalState; label: string; requiresConfirm?: boolean }> = [
  { state: "ROUND_1", label: "1라운드 시작" },
  { state: "BREAK", label: "휴식" },
  { state: "ROUND_2", label: "2라운드 시작", requiresConfirm: true },
  { state: "CLOSED", label: "세션 종료", requiresConfirm: true }
];

export function LiveOpsControls({
  snapshot,
  revealReadyCount,
  onSetSessionState,
  onTriggerReveal,
  onPublishAnnouncement
}: {
  snapshot: SessionSnapshot;
  revealReadyCount: number;
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
          description="단계 전환, 공개, 공지 발행만 빠르게 처리합니다."
          actions={null}
        />
        <div className="compact-row">
          <strong>상태 변경</strong>
          <span>1라운드 / 휴식 / 2라운드 / 종료</span>
        </div>
        <div className="button-row wrap-row">
          {SESSION_STATE_ACTIONS.map((action) => (
            <Button
              key={action.state}
              variant={snapshot.session.phase === action.state ? "primary" : "ghost"}
              onClick={() => {
                if (action.requiresConfirm) {
                  const confirmed = window.confirm(
                    action.state === "CLOSED"
                      ? "세션을 종료하면 다시 열 수 없습니다. 진행할까요?"
                      : "2라운드를 시작할까요?"
                  );
                  if (!confirmed) {
                    return;
                  }
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
          eyebrow="공지"
          title="현장 공지 발행"
          description="고객은 테이블 카드에서 공지를 바로 확인합니다."
        />
        <div className="compact-row">
          <strong>콘텐츠</strong>
          <span>운영 공지 발행</span>
        </div>
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
