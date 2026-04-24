"use client";

import { useMemo, useState } from "react";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { BranchesPanel } from "@/components/admin/BranchesPanel";
import { ContentControlPanel } from "@/components/admin/ContentControlPanel";
import { HeartGrantPanel } from "@/components/admin/HeartGrantPanel";
import { LiveOpsControls } from "@/components/admin/LiveOpsControls";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { RotationPanel } from "@/components/admin/RotationPanel";
import { SessionQrCard } from "@/components/admin/SessionQrCard";
import { SessionsPanel } from "@/components/admin/SessionsPanel";
import { Badge, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import { formatTableName } from "@/lib/mingle";
import { useMingleStore } from "@/stores/useMingleStore";
import type { AdminPanel, AdminSessionRecord, ParticipantGender } from "@/types/mingle";

const PANEL_LABELS: Record<AdminPanel, string> = {
  live: "라이브",
  rotation: "테이블 이동",
  content: "콘텐츠",
  reports: "신고",
  "admin-users": "관리자",
  branches: "브랜치",
  sessions: "세션"
};

const PHASE_LABELS: Record<string, string> = {
  CHECKIN: "체크인",
  ROUND_1: "1라운드",
  BREAK: "휴식",
  ROUND_2: "2라운드",
  MATCH_END: "매치 결과",
  CLOSED: "종료"
};

function formatPhaseLabel(phase: string) {
  return PHASE_LABELS[phase] ?? phase;
}

function formatParticipantStatusLabel(status: string) {
  if (status === "ACTIVE") return "활성";
  if (status === "IDLE") return "미입력";
  if (status === "GONE") return "장시간 미활동";
  if (status === "BLOCKED") return "운영 제한";
  return status;
}

function resolveVisiblePanels(adminSession: AdminSessionRecord | null): AdminPanel[] {
  const basePanels: AdminPanel[] = ["live", "rotation", "content", "reports"];
  if (!adminSession) {
    return basePanels;
  }

  if (adminSession.role === "HQ_ADMIN") {
    return [...basePanels, "admin-users", "branches", "sessions"];
  }

  if (adminSession.role === "BRANCH_ADMIN") {
    return [...basePanels, "sessions"];
  }

  return basePanels;
}

export function AdminDashboard({ adminSession }: { adminSession: AdminSessionRecord | null }) {
  const hydrated = useMingleStore((state) => state.hydrated);
  const snapshot = useMingleStore((state) => state.snapshot);
  const adminPanel = useMingleStore((state) => state.adminPanel);
  const setAdminPanel = useMingleStore((state) => state.setAdminPanel);
  const rotationPreview = useMingleStore((state) => state.rotationPreview);
  const setSessionState = useMingleStore((state) => state.setSessionState);
  const triggerReveal = useMingleStore((state) => state.triggerReveal);
  const generateRotationPreview = useMingleStore((state) => state.generateRotationPreview);
  const applyRotationPreview = useMingleStore((state) => state.applyRotationPreview);
  const resolveReport = useMingleStore((state) => state.resolveReport);
  const contentLibrary = useMingleStore((state) => state.contentLibrary);
  const activateContent = useMingleStore((state) => state.activateContent);
  const clearContent = useMingleStore((state) => state.clearContent);
  const publishAnnouncement = useMingleStore((state) => state.publishAnnouncement);
  const setBlacklistStatus = useMingleStore((state) => state.setBlacklistStatus);
  const grantHearts = useMingleStore((state) => state.grantHearts);
  const moveParticipant = useMingleStore((state) => state.moveParticipant);
  const createManualParticipant = useMingleStore((state) => state.createManualParticipant);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);

  const [expandedTableId, setExpandedTableId] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(null);
  const [manualNickname, setManualNickname] = useState("");
  const [manualGender, setManualGender] = useState<ParticipantGender | "">("");
  const [manualTableId, setManualTableId] = useState(1);

  const visiblePanels = useMemo(() => resolveVisiblePanels(adminSession), [adminSession]);
  const tableSummaries = useMemo(
    () =>
      snapshot
        ? buildTableSummaries(
            snapshot.participants,
            snapshot.session.tableCount,
            snapshot.session.tableCapacity,
            snapshot.session.updatedAt,
            snapshot.participantStatusMap ?? {}
          )
        : [],
    [snapshot]
  );
  const revealReadyCount = useMemo(
    () =>
      snapshot
        ? snapshot.participants.filter((participant) => participant.receivedHearts > 0).length
        : 0,
    [snapshot]
  );
  const recommendations = useMemo(
    () => (snapshot ? buildInterventionRecommendations(snapshot).slice(0, 4) : []),
    [snapshot]
  );

  if (!hydrated || !snapshot) {
    return (
      <main className="admin-shell">
        <div className="admin-stage">
          <Surface className="skeleton-block" />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-stage">
        <Surface className="admin-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">운영 관제</p>
            <h1 className="admin-title">현장 운영 대시보드</h1>
            <p className="admin-description">
              라이브 운영과 함께 관리자, 브랜치, 세션의 핵심 운영 구조를 웹에서 직접 관리합니다.
            </p>
          </div>
          <div className="badge-row">
            <Badge tone="accent">{formatPhaseLabel(snapshot.session.phase)}</Badge>
            <Badge tone={snapshot.session.revealSenders ? "warning" : "neutral"}>
              {snapshot.session.revealSenders ? "공개 ON" : "공개 OFF"}
            </Badge>
            {adminSession ? (
              <Badge tone="success">
                {adminSession.role}
                {adminSession.branchId ? ` / ${adminSession.branchId}` : ""}
              </Badge>
            ) : null}
          </div>
        </Surface>
        <Surface
          style={{
            position: "sticky",
            top: "0.5rem",
            zIndex: 5,
            padding: "0.65rem 0.9rem",
            border: "1px solid var(--color-border, #e5e7eb)",
            background: "rgba(17,24,39,0.92)",
            color: "#fff"
          }}
        >
          <div className="compact-row">
            <strong>현재 세션 상태</strong>
            <span style={{ fontWeight: 700, letterSpacing: "0.02em" }}>
              {formatPhaseLabel(snapshot.session.phase)}
            </span>
          </div>
        </Surface>

        <div className="segmented admin-segmented">
          {visiblePanels.map((panel) => (
            <button
              key={panel}
              type="button"
              className={adminPanel === panel ? "segmented-item segmented-item-active" : "segmented-item"}
              onClick={() => setAdminPanel(panel)}
            >
              {PANEL_LABELS[panel]}
            </button>
          ))}
        </div>
        {visiblePanels.includes("sessions") ? (
          <Surface>
            <div className="compact-row">
              <strong>예약/내보내기</strong>
              <button type="button" disabled>
                준비중
              </button>
            </div>
          </Surface>
        ) : null}

        {adminPanel === "live" ? (
          <div className="admin-grid">
            <LiveOpsControls
              snapshot={snapshot}
              revealReadyCount={revealReadyCount}
              onSetSessionState={setSessionState}
              onTriggerReveal={triggerReveal}
              onPublishAnnouncement={publishAnnouncement}
            />
            <div className="admin-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="테이블"
                  title="테이블 상태"
                  description="수동 등록 + 상태 경고를 함께 확인합니다. 클릭하면 참가자 상세."
                />
                <div className="compact-row">
                  <strong>참가자 제어</strong>
                  <span>수동 등록 / 이동 / 차단</span>
                </div>
                <form
                  className="compact-row"
                  style={{ gap: "0.4rem", alignItems: "center" }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const nickname = manualNickname.trim();
                    if (!nickname || !manualGender) {
                      return;
                    }
                    void createManualParticipant(
                      nickname,
                      manualTableId,
                      manualGender
                    ).then((created) => {
                      if (created) {
                        setManualNickname("");
                        setManualGender("");
                      }
                    });
                  }}
                >
                  <input
                    value={manualNickname}
                    onChange={(event) => setManualNickname(event.target.value)}
                    placeholder="닉네임"
                    style={{ flex: 1, minWidth: "8rem" }}
                  />
                  <select
                    value={manualGender}
                    onChange={(event) => setManualGender(event.target.value as ParticipantGender | "")}
                  >
                    <option value="">성별(필수)</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                  <select
                    value={manualTableId}
                    onChange={(event) => setManualTableId(Number(event.target.value))}
                  >
                    {Array.from({ length: snapshot.session.tableCount }, (_, i) => i + 1).map((tableId) => (
                      <option key={tableId} value={tableId}>
                        T{tableId}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!manualNickname.trim() || !manualGender}
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}
                  >
                    수동 등록
                  </button>
                </form>
                <div className="compact-stack">
                  {tableSummaries.map((table) => {
                    const warningLabel =
                      table.tableState === "COLLAPSING"
                        ? "위험 테이블"
                        : table.tableState === "LOW_ACTIVITY"
                        ? "주의 테이블"
                        : null;
                    const warning = Boolean(warningLabel);
                    const expanded = expandedTableId === table.tableId;
                    return (
                      <div key={table.tableId}>
                        <div
                          className="compact-row"
                          style={{
                            cursor: "pointer",
                            background: warning
                              ? table.tableState === "COLLAPSING"
                                ? "rgba(220,38,38,0.2)"
                                : "rgba(245,158,11,0.16)"
                              : undefined
                          }}
                          onClick={() =>
                            setExpandedTableId(expanded ? null : table.tableId)
                          }
                        >
                          <strong>
                            {warning ? "⚠ " : ""}
                            {formatTableName(table.tableId)}
                          </strong>
                          <span>
                            {table.occupancy}명 · 활성 {table.statusCounts.ACTIVE}
                            {table.statusCounts.GONE > 0
                              ? ` / 장시간 미활동 ${table.statusCounts.GONE}`
                              : ""}
                            {table.statusCounts.BLOCKED > 0
                              ? ` / 운영 제한 ${table.statusCounts.BLOCKED}`
                              : ""}
                            {warningLabel ? ` / ${warningLabel}` : ""}
                          </span>
                        </div>
                        {expanded ? (
                          <div
                            className="compact-stack"
                            style={{
                              paddingLeft: "0.75rem",
                              borderLeft: "2px solid var(--color-border, #e5e7eb)"
                            }}
                          >
                            {table.participants.map((participant) => {
                              const status =
                                snapshot.participantStatusMap?.[participant.id] ?? "IDLE";
                              const isSelected =
                                selectedParticipantId === participant.id;
                              return (
                                <div key={participant.id}>
                                  <div
                                    className="compact-row"
                                    style={{
                                      cursor: "pointer",
                                      opacity: status === "GONE" ? 0.5 : 1
                                    }}
                                    onClick={() =>
                                      setSelectedParticipantId(
                                        isSelected ? null : participant.id
                                      )
                                    }
                                  >
                                    <span
                                      style={{
                                        color:
                                          status === "BLOCKED"
                                            ? "var(--color-warning, #f59e0b)"
                                            : undefined
                                      }}
                                    >
                                      {participant.nickname}
                                    </span>
                                    <span
                                      style={{
                                        fontWeight:
                                          status === "GONE" || status === "BLOCKED"
                                            ? 600
                                            : undefined,
                                        color:
                                          status === "BLOCKED"
                                            ? "var(--color-warning, #f59e0b)"
                                            : status === "GONE"
                                            ? "var(--color-muted, #9ca3af)"
                                            : undefined
                                      }}
                                    >
                                      {formatParticipantStatusLabel(status)}
                                    </span>
                                  </div>
                                  {isSelected ? (
                                    <div style={{ paddingTop: "0.25rem" }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "0.5rem",
                                          justifyContent: "flex-end"
                                        }}
                                      >
                                        <button
                                          type="button"
                                          style={{
                                            fontSize: "0.75rem",
                                            padding: "0.2rem 0.5rem",
                                            cursor: "pointer"
                                          }}
                                          onClick={() => {
                                            void setBlacklistStatus(
                                              participant.id,
                                              true,
                                              "운영 제한"
                                            );
                                            setSelectedParticipantId(null);
                                          }}
                                        >
                                          차단
                                        </button>
                                        <button
                                          type="button"
                                          style={{
                                            fontSize: "0.75rem",
                                            padding: "0.2rem 0.5rem",
                                            cursor: "pointer"
                                          }}
                                          onClick={() =>
                                            setMovingParticipantId(
                                              movingParticipantId === participant.id
                                                ? null
                                                : participant.id
                                            )
                                          }
                                        >
                                          이동
                                        </button>
                                      </div>
                                      {movingParticipantId === participant.id ? (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "0.25rem",
                                            paddingTop: "0.25rem",
                                            justifyContent: "flex-end"
                                          }}
                                        >
                                          {Array.from(
                                            { length: snapshot.session.tableCount },
                                            (_, i) => i + 1
                                          )
                                            .filter((tid) => tid !== participant.tableId)
                                            .map((tid) => (
                                              <button
                                                key={tid}
                                                type="button"
                                                style={{
                                                  fontSize: "0.7rem",
                                                  padding: "0.15rem 0.4rem",
                                                  cursor: "pointer"
                                                }}
                                                onClick={() => {
                                                  void moveParticipant(
                                                    participant.id,
                                                    tid
                                                  ).then(() => {
                                                    setMovingParticipantId(null);
                                                    setSelectedParticipantId(null);
                                                  });
                                                }}
                                              >
                                                T{tid}
                                              </button>
                                            ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {snapshot.contactExchangeStats ? (
                  <div className="compact-row">
                    <strong>연락처 교환</strong>
                    <span>
                      요청 {snapshot.contactExchangeStats.totalRequests} / 대기{" "}
                      {snapshot.contactExchangeStats.pendingCount} / 완료{" "}
                      {snapshot.contactExchangeStats.completedCount} / 차단{" "}
                      {snapshot.contactExchangeStats.blockedCount}
                    </span>
                  </div>
                ) : null}
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="운영 신호"
                  title="즉시 개입 신호"
                  description="현재 추천되는 운영 개입 신호만 추려서 보여줍니다."
                />
                {recommendations.length ? (
                  <div className="compact-stack">
                    {recommendations.map((item) => (
                      <div key={item.id} className="compact-row">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="현재 경고 없음"
                    description="즉시 개입이 필요한 신호가 없습니다."
                  />
                )}
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="보조 도구"
                  title="현장 보조 기능"
                  description="핵심 조작과 분리된 운영 보조 도구입니다."
                />
                <SessionQrCard sessionId={snapshot.session.id} sessionCode={snapshot.session.code} />
                <HeartGrantPanel
                  snapshot={snapshot}
                  onGrantHearts={grantHearts}
                  onSetBlacklistStatus={setBlacklistStatus}
                />
              </Surface>
            </div>
          </div>
        ) : null}

        {adminPanel === "rotation" ? (
          <RotationPanel
            preview={rotationPreview}
            onGenerate={generateRotationPreview}
            onApply={applyRotationPreview}
          />
        ) : null}

        {adminPanel === "content" ? (
          <ContentControlPanel
            snapshot={snapshot}
            library={contentLibrary}
            onActivate={activateContent}
            onClear={clearContent}
          />
        ) : null}

        {adminPanel === "reports" ? (
          <ReportsPanel
            snapshot={snapshot}
            onResolve={resolveReport}
            onSetBlacklistStatus={setBlacklistStatus}
          />
        ) : null}

        {adminPanel === "admin-users" ? <AdminUsersPanel /> : null}
        {adminPanel === "branches" ? <BranchesPanel /> : null}
        {adminPanel === "sessions" ? (
          <SessionsPanel adminBranchId={adminSession?.role === "BRANCH_ADMIN" ? adminSession.branchId : null} />
        ) : null}

        {toast ? (
          <div className="toast toast-admin" onClick={() => dismissToast()}>
            <strong>{toast.tone.toUpperCase()}</strong>
            <span>{toast.message}</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
