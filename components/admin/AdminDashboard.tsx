"use client";

import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useMemo } from "react";
import { mingleMotion } from "@/components/motion/tokens";
import { SessionQrCard } from "@/components/admin/SessionQrCard";
import { UserPhoto } from "@/components/shared/Avatar";
import { Badge, Button, EmptyState, HeatMeter, MetricCard, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import { computeAdminKpis, formatTableName, summarizeCheckinModes } from "@/lib/mingle";
import { useMingleStore } from "@/stores/useMingleStore";
import type { AdminPanel, SessionPhase } from "@/types/mingle";

const PANEL_LABELS: Record<AdminPanel, string> = {
  overview: "운영 보기",
  rotation: "회전",
  history: "기록"
};

const PHASES: SessionPhase[] = ["CHECKIN", "ROUND_1", "ROUND_2", "MATCH_END"];

function formatPhaseLabel(phase: SessionPhase) {
  if (phase === "CHECKIN") return "체크인";
  if (phase === "ROUND_1") return "1부";
  if (phase === "ROUND_2") return "2부";
  return "종료";
}

export function AdminDashboard() {
  const hydrated = useMingleStore((state) => state.hydrated);
  const snapshot = useMingleStore((state) => state.snapshot);
  const selectedTableId = useMingleStore((state) => state.selectedTableId);
  const setSelectedTableId = useMingleStore((state) => state.setSelectedTableId);
  const adminPanel = useMingleStore((state) => state.adminPanel);
  const setAdminPanel = useMingleStore((state) => state.setAdminPanel);
  const rotationPreview = useMingleStore((state) => state.rotationPreview);
  const setPhase = useMingleStore((state) => state.setPhase);
  const toggleRevealSenders = useMingleStore((state) => state.toggleRevealSenders);
  const generatePreview = useMingleStore((state) => state.generateRotationPreview);
  const applyPreview = useMingleStore((state) => state.applyRotationPreview);
  const resetDemo = useMingleStore((state) => state.resetDemo);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);

  const tableSummaries = useMemo(
    () => (snapshot ? buildTableSummaries(snapshot.participants, snapshot.session.tableCount) : []),
    [snapshot]
  );
  const recommendations = useMemo(() => (snapshot ? buildInterventionRecommendations(snapshot) : []), [snapshot]);
  const checkinModeCounts = useMemo(
    () => (snapshot ? summarizeCheckinModes(snapshot.participants) : { qr: 0, code: 0, staff: 0 }),
    [snapshot]
  );
  const revealReadyCount = useMemo(
    () =>
      snapshot
        ? snapshot.participants.filter(
            (participant) => participant.usedFreeHearts >= snapshot.session.freeHeartLimit
          ).length
        : 0,
    [snapshot]
  );
  const pendingReports = useMemo(
    () =>
      snapshot ? snapshot.reports.filter((report) => report.status !== "RESOLVED").length : 0,
    [snapshot]
  );
  const protectedColdTables = useMemo(
    () =>
      snapshot
        ? tableSummaries.filter((table) => table.heat <= 10 && table.protectedCount > 0).length
        : 0,
    [snapshot, tableSummaries]
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

  const selectedTable =
    tableSummaries.find((table) => table.tableId === selectedTableId) ?? tableSummaries[0];
  const kpis = computeAdminKpis(tableSummaries, snapshot.participants);
  const selectedRecommendations = recommendations.filter(
    (item) => item.targetTableId === selectedTable?.tableId || !item.targetTableId
  );
  const liveSignals = [
    {
      label: "미해결 신고",
      value: `${pendingReports}건`,
      detail: pendingReports ? "바로 읽고 후속 조치를 정해야 합니다." : "지금은 대기 중인 신고가 없습니다.",
      tone: pendingReports ? "danger" : "neutral"
    },
    {
      label: "공개 게이트",
      value:
        snapshot.session.phase === "ROUND_2"
          ? snapshot.session.revealSenders
            ? "열림"
            : "닫힘"
          : "1부 진행 중",
      detail:
        snapshot.session.phase === "ROUND_2"
          ? snapshot.session.revealSenders
            ? "고객이 하트 사용량 조건을 채우면 즉시 공개됩니다."
            : `${revealReadyCount}명이 공개 준비 상태지만 운영 토글이 아직 닫혀 있습니다.`
          : "2부 전까지는 받은 수만 고객에게 노출됩니다.",
      tone:
        snapshot.session.phase === "ROUND_2" && !snapshot.session.revealSenders && revealReadyCount > 0
          ? "warning"
          : "neutral"
    },
    {
      label: "보호 대상 리스크",
      value: `${protectedColdTables}개 테이블`,
      detail:
        protectedColdTables > 0
          ? "보호 대상이 식은 테이블에 머물고 있어 운영 개입 우선순위가 높습니다."
          : "보호 대상은 현재 과열 또는 냉각 리스크 없이 분산되어 있습니다.",
      tone: protectedColdTables > 0 ? "warning" : "success"
    },
    {
      label: "회전 상태",
      value: rotationPreview ? "미리보기 준비됨" : "다음 미리보기 대기",
      detail: rotationPreview
        ? `품질 ${rotationPreview.overallBeforeQuality} → ${rotationPreview.overallAfterQuality}`
        : "구조적 회전은 생성 후 비교, 적용 순으로만 진행됩니다.",
      tone: rotationPreview ? "accent" : "neutral"
    }
  ] as const;

  return (
    <main className="admin-shell">
      <div className="admin-stage">
        <motion.section className="admin-hero" {...mingleMotion.pageEnter}>
          <div>
            <p className="eyebrow">LIVE OPS</p>
            <h1 className="admin-title">Mingle 운영 콘솔</h1>
            <p className="admin-description">
              열기, 위험 인원, 공개, 회전, 신고 기록까지 한 화면에서 읽고 바로 조치할 수 있게 구성했습니다.
            </p>
          </div>

          <div className="admin-hero-actions">
            <Badge tone={snapshot.session.revealSenders ? "accent" : "neutral"}>
              {snapshot.session.revealSenders ? "보낸 사람 공개 ON" : "보낸 사람 공개 OFF"}
            </Badge>
            <Badge tone="success">{formatPhaseLabel(snapshot.session.phase)}</Badge>
            <Button variant="ghost" onClick={() => void resetDemo()} data-testid="admin-reset-demo">
              데모 초기화
            </Button>
          </div>
        </motion.section>

        <div className="ops-signal-grid">
          {liveSignals.map((signal, index) => (
            <motion.article
              key={signal.label}
              className={`ops-signal-card ops-signal-card-${signal.tone}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.22 }}
            >
              <span className="ops-signal-label">{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </motion.article>
          ))}
        </div>

        <div className="metric-grid">
          <MetricCard
            label="참여 인원"
            value={kpis.participantCount}
            hint={`QR ${checkinModeCounts.qr} · 코드 ${checkinModeCounts.code} · 스태프 ${checkinModeCounts.staff}`}
            accent
          />
          <MetricCard label="뜨거운 테이블" value={kpis.hotTables} hint="현장 에너지가 빠르게 붙는 자리" />
          <MetricCard label="식은 테이블" value={kpis.coldTables} hint="운영 개입이 먼저 필요한 자리" />
          <MetricCard label="공개 준비" value={revealReadyCount} hint="무료 하트 3개 사용 완료 인원" />
        </div>

        <Surface>
          <SectionHeader
            eyebrow="LIVE CONTROL"
            title="세션 제어"
            description="공개는 운영 토글로만 열리며, 회전은 미리보기 후에만 적용됩니다."
            actions={
              <Button
                variant={snapshot.session.revealSenders ? "danger" : "secondary"}
                onClick={() => void toggleRevealSenders(!snapshot.session.revealSenders)}
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
                onClick={() => void setPhase(phase)}
                data-testid={`admin-phase-${phase.toLowerCase()}`}
              >
                {formatPhaseLabel(phase)}
              </Button>
            ))}
            <Button onClick={() => void generatePreview()} data-testid="admin-generate-rotation">
              회전 미리보기
            </Button>
          </div>
        </Surface>

        <div className="segmented admin-segmented">
          {(Object.keys(PANEL_LABELS) as AdminPanel[]).map((panel) => (
            <motion.button
              key={panel}
              type="button"
              className={adminPanel === panel ? "segmented-item segmented-item-active" : "segmented-item"}
              onClick={() => startTransition(() => setAdminPanel(panel))}
              whileTap={{ scale: 0.98 }}
            >
              {PANEL_LABELS[panel]}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
        {adminPanel === "overview" ? (
          <motion.div key="overview" className="admin-grid" {...mingleMotion.tabPanel}>
            <div className="admin-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="TABLE HEAT"
                  title="실시간 테이블 밀도"
                  description="열기, 밸런스, 보호 대상, 반복 만남을 같이 보여 주어 바로 판단할 수 있습니다."
                />
                <div className="admin-table-grid">
                  {tableSummaries.map((table) => (
                    <motion.button
                      key={table.tableId}
                      type="button"
                      className={selectedTable?.tableId === table.tableId ? "ops-table-card ops-table-card-active" : "ops-table-card"}
                      whileHover={mingleMotion.cardLift.whileHover}
                      whileTap={mingleMotion.cardLift.whileTap}
                      onClick={() => setSelectedTableId(table.tableId)}
                    >
                      <div className="ops-table-head">
                        <strong>{formatTableName(table.tableId)}</strong>
                        <Badge tone={table.heat >= 18 ? "warning" : table.heat <= 10 ? "neutral" : "success"}>
                          {table.heat >= 18 ? "HOT" : table.heat <= 10 ? "COLD" : "WARM"}
                        </Badge>
                      </div>
                      <HeatMeter value={table.heat} max={24} />
                      <div className="ops-table-meta">
                        <span>품질 {Math.round(table.quality)}</span>
                        <span>반복 {table.repeatMeetings}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </Surface>

              {selectedTable ? (
                <Surface className="inner-surface-highlight">
                  <SectionHeader
                    eyebrow={formatTableName(selectedTable.tableId)}
                    title="선택한 테이블 상세"
                    description="보호 대상, 티어, 균형 상태를 함께 읽을 수 있게 정리했습니다."
                  />
                  <div className="stats-row">
                    <div className="compact-row">
                      <strong>젠더 차이</strong>
                      <span>{selectedTable.genderBalance}</span>
                    </div>
                    <div className="compact-row">
                      <strong>E/I 차이</strong>
                      <span>{selectedTable.energyBalance}</span>
                    </div>
                    <div className="compact-row">
                      <strong>보호 대상</strong>
                      <span>{selectedTable.protectedCount}</span>
                    </div>
                  </div>

                  <div className="compact-members">
                    {selectedTable.participants.map((participant) => (
                      <article key={participant.id} className="compact-row admin-member-card">
                        <div className="participant-head">
                          <UserPhoto photoUrl={participant.photoUrl} gender={participant.gender} size={46} />
                          <div className="participant-copy">
                            <strong>{participant.nickname}</strong>
                            <p>{participant.job}</p>
                          </div>
                        </div>
                        <div className="badge-row">
                          <Badge tone="accent">{participant.energyType}</Badge>
                          <Badge tone="neutral">
                            {participant.tier}-{participant.subTier}
                          </Badge>
                          {participant.isHighValue || participant.isVip ? (
                            <Badge tone="warning">PROTECT</Badge>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </Surface>
              ) : null}
            </div>

            <div className="admin-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="INTERVENTION"
                  title="운영 권고"
                  description="지금 먼저 봐야 하는 위험과 개입 포인트를 우선순위로 정렬했습니다."
                />
                {selectedRecommendations.length ? (
                  <div className="compact-stack">
                    {selectedRecommendations.map((recommendation) => (
                      <div key={recommendation.id} className="compact-row">
                        <div>
                          <strong>{recommendation.title}</strong>
                          <span>{recommendation.description}</span>
                        </div>
                        <Badge tone={recommendation.priority === "HIGH" ? "warning" : recommendation.priority === "MEDIUM" ? "accent" : "neutral"}>
                          {recommendation.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="지금은 긴급 권고가 없습니다"
                    description="현재 테이블 배치와 라운드 상태가 비교적 안정적입니다."
                  />
                )}
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="VALUE SIGNAL"
                  title="보호 대상 현황"
                  description="고가치 또는 VIP 참가자는 회전 시 과열되지 않도록 분산합니다."
                />
                <div className="compact-stack">
                  <div className="compact-row">
                    <strong>보호 대상 수</strong>
                    <span>{kpis.highValueParticipants}</span>
                  </div>
                  <div className="compact-row">
                    <strong>공개 준비 인원</strong>
                    <span>{revealReadyCount}</span>
                  </div>
                </div>
              </Surface>

              <SessionQrCard sessionId={snapshot.session.id} sessionCode={snapshot.session.code} />
            </div>
          </motion.div>
        ) : null}

        {adminPanel === "rotation" ? (
          <motion.div key="rotation" className="admin-grid" {...mingleMotion.tabPanel}>
            <div className="admin-main-column">
              <Surface className="inner-surface-highlight">
                <SectionHeader
                  eyebrow="ROTATION PREVIEW"
                  title="미리보고 적용하는 구조적 회전"
                  description="첫 자리는 수동일 수 있어도, 이후 회전은 품질과 균형 기준으로 정렬됩니다."
                  actions={
                    rotationPreview ? (
                      <Button onClick={() => void applyPreview()} data-testid="admin-apply-rotation">
                        이 미리보기 적용
                      </Button>
                    ) : undefined
                  }
                />

                {rotationPreview ? (
                  <>
                    <div className="stats-row">
                      <div className="compact-row">
                        <strong>품질 변화</strong>
                        <span>
                          {rotationPreview.overallBeforeQuality} → {rotationPreview.overallAfterQuality}
                        </span>
                      </div>
                      <div className="compact-row">
                        <strong>Heat 변화</strong>
                        <span>
                          {rotationPreview.overallBeforeHeat} → {rotationPreview.overallAfterHeat}
                        </span>
                      </div>
                      <div className="compact-row">
                        <strong>Fairness Δ</strong>
                        <span>{rotationPreview.fairnessDelta}</span>
                      </div>
                    </div>

                    <motion.div className="rotation-stack" {...mingleMotion.opsCommit}>
                      {rotationPreview.tablePreviews.map((table) => (
                        <article key={table.tableId} className="preview-card">
                          <SectionHeader
                            eyebrow={formatTableName(table.tableId)}
                            title={`${table.beforeParticipants.length}명 → ${table.afterParticipants.length}명`}
                            description={`품질 ${table.beforeQuality} → ${table.afterQuality} / Heat ${table.beforeHeat} → ${table.afterHeat}`}
                          />
                          <div className="badge-row">
                            {table.notes.map((note) => (
                              <Badge key={note} tone="success">
                                {note}
                              </Badge>
                            ))}
                            {table.warnings.map((warning) => (
                              <Badge key={warning} tone="warning">
                                {warning}
                              </Badge>
                            ))}
                          </div>
                          <div className="participant-grid">
                            {table.afterParticipants.map((participant) => (
                              <article key={participant.id} className="participant-card">
                                <div className="participant-head">
                                  <UserPhoto photoUrl={participant.photoUrl} gender={participant.gender} size={48} />
                                  <div className="participant-copy">
                                    <strong>{participant.nickname}</strong>
                                    <p>
                                      {participant.job} · {participant.energyType}
                                    </p>
                                  </div>
                                </div>
                                <div className="badge-row">
                                  <Badge tone="accent">{participant.tier}</Badge>
                                  <Badge tone="neutral">{participant.subTier}</Badge>
                                </div>
                              </article>
                            ))}
                          </div>
                        </article>
                      ))}
                    </motion.div>
                  </>
                ) : (
                  <EmptyState
                    title="아직 회전 미리보기가 없습니다"
                    description="상단의 회전 미리보기 버튼으로 다음 배치를 먼저 검토해 보세요."
                    action={
                      <Button onClick={() => void generatePreview()} data-testid="admin-generate-rotation-empty">
                        회전 미리보기 생성
                      </Button>
                    }
                  />
                )}
              </Surface>
            </div>

            <div className="admin-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="ROTATION PRINCIPLES"
                  title="엔진이 우선하는 기준"
                  description="단순 셔플이 아니라 운영 리스크를 줄이는 방향으로 배치합니다."
                />
                <div className="compact-stack">
                  <div className="compact-row">
                    <strong>A티어 보호</strong>
                    <span>강한 참가자끼리 과도하게 쏠리지 않도록 분산</span>
                  </div>
                  <div className="compact-row">
                    <strong>낮은 반응 구제</strong>
                    <span>열기가 있는 테이블과 연결해 이탈 가능성 완화</span>
                  </div>
                  <div className="compact-row">
                    <strong>반복 만남 회피</strong>
                    <span>이미 만난 상대와 다시 겹치는 비율 최소화</span>
                  </div>
                </div>
              </Surface>
            </div>
          </motion.div>
        ) : null}

        {adminPanel === "history" ? (
          <motion.div key="history" className="admin-grid" {...mingleMotion.tabPanel}>
            <div className="admin-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="AUDIT LOG"
                  title="운영 기록"
                  description="공개, 회전, 체크인, 신고까지 모두 로그로 남겨 현장 판단을 추적합니다."
                />
                <div className="compact-stack">
                  {snapshot.auditLogs.map((item) => (
                    <div key={item.id} className="audit-item">
                      <strong>{item.action}</strong>
                      <span>{item.message}</span>
                      <span>{new Date(item.createdAt).toLocaleString("ko-KR")}</span>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>

            <div className="admin-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="REPORTS"
                  title="고객 신고"
                  description="운영 개입이 필요한 신고를 즉시 읽고 후속 조치를 판단합니다."
                />
                {snapshot.reports.length ? (
                  <div className="compact-stack">
                    {snapshot.reports.map((report) => {
                      const reporter = snapshot.participants.find((item) => item.id === report.reporterId);
                      const target = snapshot.participants.find((item) => item.id === report.targetId);

                      return (
                        <div key={report.id} className="compact-row">
                          <div>
                            <strong>
                              {reporter?.nickname ?? "알 수 없음"} → {target?.nickname ?? "알 수 없음"}
                            </strong>
                            <span>{report.reason}</span>
                            <span>{report.details}</span>
                          </div>
                          <Badge tone={report.status === "RESOLVED" ? "success" : "warning"}>{report.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="아직 접수된 신고가 없습니다"
                    description="이 세션에서는 고객 신고가 아직 접수되지 않았습니다."
                  />
                )}
              </Surface>
            </div>
          </motion.div>
        ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.message}
              className="toast toast-admin"
              {...mingleMotion.toast}
              onClick={() => dismissToast()}
            >
              <Badge tone={toast.tone === "success" ? "success" : toast.tone === "warning" ? "warning" : "accent"}>
                {toast.tone.toUpperCase()}
              </Badge>
              <span>{toast.message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
