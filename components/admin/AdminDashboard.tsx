"use client";

import { useMemo } from "react";
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
import type { AdminPanel, AdminSessionRecord } from "@/types/mingle";

const PANEL_LABELS: Record<AdminPanel, string> = {
  live: "라이브",
  rotation: "테이블 이동",
  content: "콘텐츠",
  reports: "신고",
  "admin-users": "관리자",
  branches: "브랜치",
  sessions: "세션"
};

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
  const setPhase = useMingleStore((state) => state.setPhase);
  const toggleRevealSenders = useMingleStore((state) => state.toggleRevealSenders);
  const generateRotationPreview = useMingleStore((state) => state.generateRotationPreview);
  const applyRotationPreview = useMingleStore((state) => state.applyRotationPreview);
  const resolveReport = useMingleStore((state) => state.resolveReport);
  const contentLibrary = useMingleStore((state) => state.contentLibrary);
  const activateContent = useMingleStore((state) => state.activateContent);
  const clearContent = useMingleStore((state) => state.clearContent);
  const publishAnnouncement = useMingleStore((state) => state.publishAnnouncement);
  const setBlacklistStatus = useMingleStore((state) => state.setBlacklistStatus);
  const grantHearts = useMingleStore((state) => state.grantHearts);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);

  const visiblePanels = useMemo(() => resolveVisiblePanels(adminSession), [adminSession]);
  const tableSummaries = useMemo(
    () =>
      snapshot
        ? buildTableSummaries(
            snapshot.participants,
            snapshot.session.tableCount,
            snapshot.session.tableCapacity,
            snapshot.session.updatedAt
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
            <p className="eyebrow">LIVE CONTROL</p>
            <h1 className="admin-title">현장 운영 대시보드</h1>
            <p className="admin-description">
              라이브 운영과 함께 관리자, 브랜치, 세션의 핵심 운영 구조를 웹에서 직접 관리합니다.
            </p>
          </div>
          <div className="badge-row">
            <Badge tone="accent">{snapshot.session.phase}</Badge>
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

        {adminPanel === "live" ? (
          <div className="admin-grid">
            <LiveOpsControls
              snapshot={snapshot}
              revealReadyCount={revealReadyCount}
              onSetPhase={setPhase}
              onToggleReveal={toggleRevealSenders}
              onPublishAnnouncement={publishAnnouncement}
            />
            <div className="admin-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="TABLES"
                  title="테이블 상태"
                  description="현장 테이블 요약을 빠르게 확인합니다."
                />
                <div className="compact-stack">
                  {tableSummaries.map((table) => (
                    <div key={table.tableId} className="compact-row">
                      <strong>{formatTableName(table.tableId)}</strong>
                      <span>
                        Quality {table.quality} / Heat {table.heat}
                      </span>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="OPS SIGNAL"
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

              <SessionQrCard sessionId={snapshot.session.id} sessionCode={snapshot.session.code} />
              <HeartGrantPanel
                snapshot={snapshot}
                onGrantHearts={grantHearts}
                onSetBlacklistStatus={setBlacklistStatus}
              />
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
