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
import { Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import { formatTableName } from "@/lib/mingle";
import { useMingleStore } from "@/stores/useMingleStore";
import type { AdminSessionRecord, ParticipantGender } from "@/types/mingle";

type AdminMenuKey =
  | "dashboard"
  | "branches"
  | "sessions"
  | "live"
  | "participants"
  | "content"
  | "reports"
  | "reservation-export"
  | "admin-users"
  | "settings";

type MenuItem = {
  key: AdminMenuKey;
  label: string;
  ready: boolean;
};

type HierarchyTier = "hq" | "branch" | "session" | "live";

type MenuGroup = {
  tier: HierarchyTier;
  title: string;
  items: MenuItem[];
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

function getMenuGroups(adminSession: AdminSessionRecord | null): MenuGroup[] {
  const isHqAdmin = adminSession?.role === "HQ_ADMIN";
  const isBranchAdmin = adminSession?.role === "BRANCH_ADMIN";
  const canManageOrg = isHqAdmin || isBranchAdmin;

  return [
    {
      tier: "hq",
      title: "본사(HQ)",
      items: [
        { key: "dashboard", label: "대시보드", ready: true },
        { key: "admin-users", label: "관리자 관리", ready: isHqAdmin }
      ]
    },
    {
      tier: "branch",
      title: "브랜치",
      items: [
        { key: "branches", label: "브랜치 관리", ready: canManageOrg },
        { key: "reservation-export", label: "예약/보내기", ready: false },
        { key: "settings", label: "설정", ready: false }
      ]
    },
    {
      tier: "session",
      title: "세션",
      items: [
        { key: "sessions", label: "세션 관리", ready: canManageOrg },
        { key: "content", label: "콘텐츠 관리", ready: true },
        { key: "reports", label: "신고/제재", ready: true }
      ]
    },
    {
      tier: "live",
      title: "라이브 운영",
      items: [
        { key: "live", label: "라이브 운영", ready: true },
        { key: "participants", label: "참가자 관리", ready: true }
      ]
    }
  ];
}

function getActiveHierarchyTier(menu: AdminMenuKey): HierarchyTier {
  if (menu === "dashboard" || menu === "admin-users") {
    return "hq";
  }
  if (menu === "branches" || menu === "reservation-export" || menu === "settings") {
    return "branch";
  }
  if (menu === "sessions" || menu === "content" || menu === "reports") {
    return "session";
  }
  return "live";
}

export function AdminDashboard({ adminSession }: { adminSession: AdminSessionRecord | null }) {
  const hydrated = useMingleStore((state) => state.hydrated);
  const snapshot = useMingleStore((state) => state.snapshot);
  const snapshotLoadErrorCode = useMingleStore((state) => state.snapshotLoadErrorCode);
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
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>("dashboard");

  const menuGroups = useMemo(() => getMenuGroups(adminSession), [adminSession]);
  const activeHierarchyTier = getActiveHierarchyTier(activeMenu);
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
  const activeTables = useMemo(
    () => tableSummaries.filter((table) => table.occupancy > 0).length,
    [tableSummaries]
  );
  const unresolvedReports = useMemo(
    () => snapshot?.reports.filter((report) => report.status !== "RESOLVED").length ?? 0,
    [snapshot]
  );
  const blacklistCount = useMemo(() => snapshot?.blacklist?.length ?? 0, [snapshot]);
  const mutualMatchCount = useMemo(() => {
    if (!snapshot) {
      return 0;
    }
    const pairKeys = new Set<string>();
    snapshot.hearts.forEach((heart) => {
      const isMutual = snapshot.hearts.some(
        (target) => target.senderId === heart.recipientId && target.recipientId === heart.senderId
      );
      if (!isMutual) {
        return;
      }
      const key = [heart.senderId, heart.recipientId].sort().join(":");
      pairKeys.add(key);
    });
    return pairKeys.size;
  }, [snapshot]);

  if (!hydrated) {
    return (
      <main className="admin-shell">
        <div className="admin-stage">
          <Surface className="skeleton-block" />
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="admin-shell">
        <div className="admin-stage">
          <Surface>
            <EmptyState
              title="세션 정보를 불러오지 못했습니다."
              description="잠시 후 새로고침하거나 관리자에게 문의해 주세요."
            />
            {snapshotLoadErrorCode ? (
              <p className="field-help" style={{ marginTop: "0.5rem" }}>
                오류 코드: {snapshotLoadErrorCode}
              </p>
            ) : null}
          </Surface>
        </div>
      </main>
    );
  }

  const renderLiveOps = () => (
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
              void createManualParticipant(nickname, manualTableId, manualGender).then((created) => {
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
            <select value={manualTableId} onChange={(event) => setManualTableId(Number(event.target.value))}>
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
                    onClick={() => setExpandedTableId(expanded ? null : table.tableId)}
                  >
                    <strong>
                      {warning ? "⚠ " : ""}
                      {formatTableName(table.tableId)}
                    </strong>
                    <span>
                      {table.occupancy}명 · 활성 {table.statusCounts.ACTIVE}
                      {table.statusCounts.GONE > 0 ? ` / 장시간 미활동 ${table.statusCounts.GONE}` : ""}
                      {table.statusCounts.BLOCKED > 0 ? ` / 운영 제한 ${table.statusCounts.BLOCKED}` : ""}
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
                        const status = snapshot.participantStatusMap?.[participant.id] ?? "IDLE";
                        const isSelected = selectedParticipantId === participant.id;
                        return (
                          <div key={participant.id}>
                            <div
                              className="compact-row"
                              style={{ cursor: "pointer", opacity: status === "GONE" ? 0.5 : 1 }}
                              onClick={() => setSelectedParticipantId(isSelected ? null : participant.id)}
                            >
                              <span
                                style={{
                                  color:
                                    status === "BLOCKED" ? "var(--color-warning, #f59e0b)" : undefined
                                }}
                              >
                                {participant.nickname}
                              </span>
                              <span
                                style={{
                                  fontWeight: status === "GONE" || status === "BLOCKED" ? 600 : undefined,
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
                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.2rem 0.5rem",
                                      cursor: "pointer"
                                    }}
                                    onClick={() => {
                                      void setBlacklistStatus(participant.id, true, "운영 제한");
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
                                        movingParticipantId === participant.id ? null : participant.id
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
                                    {Array.from({ length: snapshot.session.tableCount }, (_, i) => i + 1)
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
                                            void moveParticipant(participant.id, tid).then(() => {
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
                요청 {snapshot.contactExchangeStats.totalRequests} / 대기 {snapshot.contactExchangeStats.pendingCount}
                {" / "}완료 {snapshot.contactExchangeStats.completedCount} / 차단{" "}
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
            <EmptyState title="현재 경고 없음" description="즉시 개입이 필요한 신호가 없습니다." />
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
  );

  const renderDashboardHome = () => (
    <div className="admin-main-column">
      <div className="metric-grid admin-dashboard-metric-grid">
        <Surface className="metric-card">
          <strong>오늘 세션 요약</strong>
          <p className="metric-hint">
            {snapshot.session.sessionDateLabel} · {snapshot.session.sessionTimeLabel} · {snapshot.session.venueName}
          </p>
        </Surface>
        <Surface className="metric-card">
          <strong>현재 참가자 수</strong>
          <p className="metric-value">{snapshot.participants.length}명</p>
        </Surface>
        <Surface className="metric-card">
          <strong>활성 테이블 수</strong>
          <p className="metric-value">
            {activeTables}/{snapshot.session.tableCount}
          </p>
        </Surface>
        <Surface className="metric-card">
          <strong>신고/제재 현황</strong>
          <p className="metric-hint">
            신고 대기 {unresolvedReports}건 · 제재 {blacklistCount}건
          </p>
        </Surface>
        <Surface className="metric-card">
          <strong>하트/매칭 현황</strong>
          <p className="metric-hint">
            하트 {snapshot.hearts.length}건 · 상호 매칭 {mutualMatchCount}건
          </p>
        </Surface>
        <Surface className="metric-card">
          <strong>연락처 교환 현황</strong>
          <p className="metric-hint">
            요청 {snapshot.contactExchangeStats?.totalRequests ?? 0} / 완료{" "}
            {snapshot.contactExchangeStats?.completedCount ?? 0}
          </p>
        </Surface>
      </div>

      <Surface>
        <SectionHeader
          eyebrow="운영 로그"
          title="최근 운영 로그"
          description="세션 운영에서 방금 발생한 핵심 이력입니다."
        />
        {snapshot.auditLogs.length ? (
          <div className="compact-stack">
            {snapshot.auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="compact-row">
                <strong>{log.action}</strong>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="운영 로그가 없습니다." description="로그가 생성되면 이 영역에 표시됩니다." />
        )}
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="준비중"
          title="예약/내보내기"
          description="운영 진입점은 고정되었고, 상세 기능은 준비중입니다."
        />
        <Button disabled>준비중</Button>
      </Surface>
    </div>
  );

  const renderSection = () => {
    switch (activeMenu) {
      case "dashboard":
        return renderDashboardHome();
      case "live":
        return renderLiveOps();
      case "participants":
        return (
          <Surface>
            <SectionHeader
              eyebrow="참가자 관리"
              title="실시간 참가자 상태"
              description="라이브 운영 탭의 테이블/이동/차단 제어를 함께 사용합니다."
            />
            <div className="compact-stack">
              <div className="compact-row">
                <strong>현재 참가자</strong>
                <span>{snapshot.participants.length}명</span>
              </div>
              <div className="compact-row">
                <strong>운영 제한</strong>
                <span>{blacklistCount}명</span>
              </div>
            </div>
          </Surface>
        );
      case "content":
        return (
          <div className="admin-main-column">
            <ContentControlPanel
              snapshot={snapshot}
              library={contentLibrary}
              onActivate={activateContent}
              onClear={clearContent}
            />
            <RotationPanel
              preview={rotationPreview}
              onGenerate={generateRotationPreview}
              onApply={applyRotationPreview}
            />
          </div>
        );
      case "reports":
        return (
          <ReportsPanel
            snapshot={snapshot}
            onResolve={resolveReport}
            onSetBlacklistStatus={setBlacklistStatus}
          />
        );
      case "admin-users":
        return <AdminUsersPanel />;
      case "branches":
        return (
          <div className="admin-main-column">
            <Surface>
              <SectionHeader
                eyebrow="브랜치 관리"
                title="현재 브랜치 요약"
                description="현재 세션 기준 브랜치 컨텍스트를 먼저 확인합니다."
              />
              <div className="compact-stack">
                <div className="compact-row">
                  <strong>브랜치 ID</strong>
                  <span>{snapshot.session.branchId}</span>
                </div>
                <div className="compact-row">
                  <strong>브랜치명</strong>
                  <span>{snapshot.session.branchName}</span>
                </div>
              </div>
            </Surface>
            <BranchesPanel />
          </div>
        );
      case "sessions":
        return (
          <div className="admin-main-column">
            <Surface>
              <SectionHeader
                eyebrow="세션 관리"
                title="현재 오픈 세션 요약"
                description="브랜치별 세션 목록과 현재 운영 세션 정보를 함께 봅니다."
              />
              <div className="compact-stack">
                <div className="compact-row">
                  <strong>세션 ID</strong>
                  <span>{snapshot.session.id}</span>
                </div>
                <div className="compact-row">
                  <strong>세션 상태</strong>
                  <span>{formatPhaseLabel(snapshot.session.phase)}</span>
                </div>
              </div>
            </Surface>
            <SessionsPanel
              adminBranchId={adminSession?.role === "BRANCH_ADMIN" ? adminSession.branchId : null}
            />
          </div>
        );
      case "reservation-export":
        return (
          <Surface>
            <SectionHeader
              eyebrow="예약/내보내기"
              title="예약 연동/내보내기"
              description="운영 IA를 먼저 고정했습니다. 상세 작업은 준비중입니다."
            />
            <Button disabled>준비중</Button>
          </Surface>
        );
      case "settings":
        return (
          <Surface>
            <SectionHeader
              eyebrow="설정"
              title="운영 설정"
              description="시스템 정책/운영 설정 화면은 준비중입니다."
            />
            <Button disabled>준비중</Button>
          </Surface>
        );
      default:
        return renderDashboardHome();
    }
  };

  return (
    <main className="admin-shell">
      <div className="admin-console-layout">
        <aside className="admin-console-sidebar">
          <div className="admin-console-brand">
            <p className="eyebrow">운영 콘솔</p>
            <h2>본사 → 지점 → 세션 → 현장</h2>
          </div>
          <nav className="admin-console-nav" aria-label="운영 메뉴 (계층별)">
            {menuGroups.map((group) => (
              <div
                key={group.tier}
                className={`admin-console-nav-group admin-console-nav-group-tier-${group.tier}`}
              >
                <p className="admin-console-nav-group-title">{group.title}</p>
                <div className="admin-console-nav-group-items">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!item.ready}
                      className={
                        activeMenu === item.key
                          ? "admin-console-nav-item admin-console-nav-item-active"
                          : "admin-console-nav-item"
                      }
                      onClick={() => setActiveMenu(item.key)}
                    >
                      <span>{item.label}</span>
                      {!item.ready ? <small>준비중</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="admin-console-main">
          <Surface className="admin-console-topbar">
            <div className="admin-console-topbar-stack">
              <nav className="admin-console-breadcrumb" aria-label="운영 계층: 본사 → 브랜치 → 세션 → 라이브">
                <ol className="admin-console-breadcrumb-list">
                  <li
                    className={
                      activeHierarchyTier === "hq"
                        ? "admin-console-breadcrumb-item admin-console-breadcrumb-item-active"
                        : "admin-console-breadcrumb-item"
                    }
                  >
                    <span className="admin-console-breadcrumb-tier">본사(HQ)</span>
                    <span className="admin-console-breadcrumb-value">{snapshot.session.hqId}</span>
                  </li>
                  <li className="admin-console-breadcrumb-sep" aria-hidden="true">
                    &gt;
                  </li>
                  <li
                    className={
                      activeHierarchyTier === "branch"
                        ? "admin-console-breadcrumb-item admin-console-breadcrumb-item-active"
                        : "admin-console-breadcrumb-item"
                    }
                  >
                    <span className="admin-console-breadcrumb-tier">브랜치</span>
                    <span className="admin-console-breadcrumb-value">{snapshot.session.branchName}</span>
                  </li>
                  <li className="admin-console-breadcrumb-sep" aria-hidden="true">
                    &gt;
                  </li>
                  <li
                    className={
                      activeHierarchyTier === "session"
                        ? "admin-console-breadcrumb-item admin-console-breadcrumb-item-active"
                        : "admin-console-breadcrumb-item"
                    }
                  >
                    <span className="admin-console-breadcrumb-tier">세션</span>
                    <span className="admin-console-breadcrumb-value">{snapshot.session.name}</span>
                  </li>
                  <li className="admin-console-breadcrumb-sep" aria-hidden="true">
                    &gt;
                  </li>
                  <li
                    className={
                      activeHierarchyTier === "live"
                        ? "admin-console-breadcrumb-item admin-console-breadcrumb-item-active"
                        : "admin-console-breadcrumb-item"
                    }
                  >
                    <span className="admin-console-breadcrumb-tier">라이브 운영</span>
                    <span className="admin-console-breadcrumb-value">
                      {formatPhaseLabel(snapshot.session.phase)}
                    </span>
                  </li>
                </ol>
              </nav>
              <div className="admin-console-topbar-row">
                <div className="admin-console-topbar-meta">
                  <p>
                    <strong>권한</strong> {adminSession ? adminSession.role : "미인증"}
                  </p>
                </div>
                <div className="button-row wrap-row">
                  <Button variant="secondary">미리보기</Button>
                  <Button variant="ghost" onClick={() => (window.location.href = "/")}>
                    나가기
                  </Button>
                </div>
              </div>
            </div>
          </Surface>

          <div className="admin-console-content">{renderSection()}</div>
        </section>
      </div>

      {toast ? (
        <div className="toast toast-admin" onClick={() => dismissToast()}>
          <strong>{toast.tone.toUpperCase()}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </main>
  );
}
