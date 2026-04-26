 "use client";

import { useMemo, useState } from "react";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { HeartGrantPanel } from "@/components/admin/HeartGrantPanel";
import { LiveOpsControls } from "@/components/admin/LiveOpsControls";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { SessionQrCard } from "@/components/admin/SessionQrCard";
import { Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import {
  createCsvFromRows,
  parseManualReservationCsv,
  type ManualReservationRow
} from "@/lib/reservations/manual-reservation";
import { getMingleRepository } from "@/lib/repositories";
import {
  ADMIN_DEFAULT_CONFIG,
  buildCustomerProfileSummaries,
  formatTableName,
  STAFF_RECOMMENDATION_TAGS
} from "@/lib/mingle";
import { useMingleStore } from "@/stores/useMingleStore";
import type {
  AdminSessionRecord,
  CustomerProfileSummary,
  ParticipantGender,
  ReservationBridgeRecord
} from "@/types/mingle";

type AdminPageKey =
  | "hq-dashboard"
  | "hq-customers"
  | "hq-reservations"
  | "hq-admin-users"
  | "branch-dashboard"
  | "branch-reservations"
  | "branch-session"
  | "branch-live"
  | "branch-customers"
  | "branch-settings";

type BranchNode = {
  branchId: string;
  branchName: string;
  sessionName: string;
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

function getContextPageLabel(page: AdminPageKey) {
  if (page === "hq-dashboard") return "본부 대시보드";
  if (page === "hq-customers") return "전체 고객 DB";
  if (page === "hq-reservations") return "전체 예약 현황";
  if (page === "hq-admin-users") return "관리자 관리";
  if (page === "branch-dashboard") return "지점 대시보드";
  if (page === "branch-reservations") return "예약 현황";
  if (page === "branch-session") return "현재 회차";
  if (page === "branch-live") return "라이브 콘솔";
  if (page === "branch-customers") return "참가자/고객 현황";
  return "지점 설정";
}

export function AdminDashboard({ adminSession }: { adminSession: AdminSessionRecord | null }) {
  const hydrated = useMingleStore((state) => state.hydrated);
  const snapshot = useMingleStore((state) => state.snapshot);
  const snapshotLoadErrorCode = useMingleStore((state) => state.snapshotLoadErrorCode);
  const setSessionState = useMingleStore((state) => state.setSessionState);
  const triggerReveal = useMingleStore((state) => state.triggerReveal);
  const resolveReport = useMingleStore((state) => state.resolveReport);
  const publishAnnouncement = useMingleStore((state) => state.publishAnnouncement);
  const setBlacklistStatus = useMingleStore((state) => state.setBlacklistStatus);
  const grantHearts = useMingleStore((state) => state.grantHearts);
  const moveParticipant = useMingleStore((state) => state.moveParticipant);
  const createManualParticipant = useMingleStore((state) => state.createManualParticipant);
  const syncFromRepository = useMingleStore((state) => state.syncFromRepository);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);

  const [expandedTableId, setExpandedTableId] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(null);
  const [manualNickname, setManualNickname] = useState("");
  const [manualGender, setManualGender] = useState<ParticipantGender | "">("");
  const [manualTableId, setManualTableId] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reservationRound, setReservationRound] = useState<"1부" | "2부" | "1+2부">("1부");
  const [reservationCsv, setReservationCsv] = useState("");
  const [reservationPreviewRows, setReservationPreviewRows] = useState<ManualReservationRow[]>([]);
  const [reservationImportIssues, setReservationImportIssues] = useState<Array<{ row: number; message: string }>>([]);
  const [duplicatePhones, setDuplicatePhones] = useState<string[]>([]);
  const [reservationImportApplied, setReservationImportApplied] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"전체" | "운영 제한" | "재방문" | "신고 연관">("전체");
  const [staffControlParticipantId, setStaffControlParticipantId] = useState<string>("");
  const [staffMemoMap, setStaffMemoMap] = useState<Record<string, string>>({});
  const [staffGradeMap, setStaffGradeMap] = useState<Record<string, "S" | "A" | "B" | "C" | "">>({});
  const [staffTagsMap, setStaffTagsMap] = useState<Record<string, string[]>>({});

  const persistedReservationRows = useMemo<ManualReservationRow[]>(
    () =>
      (snapshot?.reservations ?? []).map((row) => ({
        source: row.source ?? "CSV",
        externalReservationId: row.reservationExternalId ?? undefined,
        eventDate: row.eventDate,
        slot: row.slot ?? "1부",
        name: row.name ?? row.reservationId,
        phone: row.phone ?? "",
        normalizedPhone: row.normalizedPhone ?? "",
        gender: row.gender ?? "",
        birthYear: row.birthYear != null ? String(row.birthYear) : undefined,
        age: row.age != null ? String(row.age) : undefined,
        paymentStatus: row.paymentStatus ?? "",
        reservationStatus: row.reservationStatus ?? row.status,
        memo: row.memo ?? "",
        importedAt: row.importedAt ?? "",
        rawRow: Object.fromEntries(
          Object.entries(row.rawRow ?? {}).map(([key, value]) => [key, String(value ?? "")])
        )
      })),
    [snapshot?.reservations]
  );
  const reservationRows = persistedReservationRows.length > 0 ? persistedReservationRows : reservationPreviewRows;

  const isHqAdmin = adminSession?.role === "HQ_ADMIN";
  const isBranchScoped = adminSession?.role === "BRANCH_ADMIN" || adminSession?.role === "STAFF";
  const branchNodes = useMemo<BranchNode[]>(() => {
    if (!snapshot) return [];
    const nodes = [
      {
        branchId: snapshot.session.branchId,
        branchName: snapshot.session.branchName || snapshot.session.branchId,
        sessionName: snapshot.session.name
      }
    ];
    if (isBranchScoped && adminSession?.branchId) {
      return nodes.filter((node) => node.branchId === adminSession.branchId);
    }
    return nodes;
  }, [adminSession?.branchId, isBranchScoped, snapshot]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchNodes[0]?.branchId ?? "");
  const selectedBranch = branchNodes.find((node) => node.branchId === selectedBranchId) ?? branchNodes[0] ?? null;
  const [activePage, setActivePage] = useState<AdminPageKey>(isHqAdmin ? "hq-dashboard" : "branch-dashboard");
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
  const unresolvedReports = useMemo(
    () => snapshot?.reports.filter((report) => report.status !== "RESOLVED").length ?? 0,
    [snapshot]
  );
  const blacklistCount = useMemo(() => snapshot?.blacklist?.length ?? 0, [snapshot]);
  const customerSummaries = useMemo<CustomerProfileSummary[]>(
    () => (snapshot ? buildCustomerProfileSummaries(snapshot) : []),
    [snapshot]
  );
  const filteredCustomerSummaries = useMemo(() => {
    const query = customerQuery.trim();
    return customerSummaries.filter((customer) => {
      const byQuery =
        !query ||
        customer.name.includes(query) ||
        customer.customerId.includes(query) ||
        (customer.phone ?? "").includes(query.replace(/\D/g, ""));
      if (!byQuery) return false;
      if (customerFilter === "운영 제한") return customer.isBlacklisted;
      if (customerFilter === "재방문") return customer.totalVisitCount >= 2;
      if (customerFilter === "신고 연관") return customer.hasReportHistory;
      return true;
    });
  }, [customerFilter, customerQuery, customerSummaries]);
  const selectedStaffParticipant =
    snapshot?.participants.find((participant) => participant.id === staffControlParticipantId) ?? null;

  const toggleStaffTag = (participantId: string, tag: string) => {
    setStaffTagsMap((current) => {
      const prev = current[participantId] ?? [];
      const next = prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag];
      return { ...current, [participantId]: next };
    });
  };

  const downloadCsvFile = (fileName: string, csv: string) => {
    if (typeof window === "undefined") return;
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

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
            {snapshotLoadErrorCode ? <p className="field-help admin-error-code">오류 코드: {snapshotLoadErrorCode}</p> : null}
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
          <SectionHeader eyebrow="위험 경고" title="운영 위험 경고" description="주의/위험 신호를 먼저 확인합니다." />
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
            <EmptyState title="주의 항목이 없습니다." description="현재 즉시 개입이 필요한 항목이 없습니다." />
          )}
        </Surface>

        <Surface>
          <SectionHeader
            eyebrow="테이블 상태"
            title="테이블 상태"
            description="테이블 버튼 그리드에서 선택 후 참가자 상태를 확인합니다."
          />
          <div className="compact-row">
            <strong>참가자 제어</strong>
            <span>수동 등록 / 이동 / 차단</span>
          </div>
          <form
            className="compact-row admin-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const nickname = manualNickname.trim();
              if (!nickname || !manualGender) {
                return;
              }
              const confirmed = window.confirm("수동 참가자를 등록할까요?");
              if (!confirmed) {
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
              className="admin-inline-input"
            />
            <select
              value={manualGender}
              onChange={(event) => setManualGender(event.target.value as ParticipantGender | "")}
            >
              <option value="">성별(필수)</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
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
              className="admin-mini-button"
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
                    data-tone={warning ? (table.tableState === "COLLAPSING" ? "danger" : "warning") : undefined}
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
                    <div className="compact-stack admin-table-detail-stack">
                      {table.participants.map((participant) => {
                        const status = snapshot.participantStatusMap?.[participant.id] ?? "IDLE";
                        const isSelected = selectedParticipantId === participant.id;
                        return (
                          <div key={participant.id}>
                            <div
                              className="compact-row admin-participant-row"
                              data-status={status}
                              onClick={() => setSelectedParticipantId(isSelected ? null : participant.id)}
                            >
                              <span className="admin-participant-name">{participant.nickname}</span>
                              <span className="admin-participant-status">{formatParticipantStatusLabel(status)}</span>
                            </div>
                            {isSelected ? (
                              <div className="admin-participant-actions-wrap">
                                <div className="admin-participant-actions">
                                  <button
                                    type="button"
                                    className="admin-mini-button"
                                    onClick={() => {
                                      const confirmed = window.confirm("해당 참가자를 운영 제한할까요?");
                                      if (!confirmed) {
                                        return;
                                      }
                                      void setBlacklistStatus(participant.id, true, "운영 제한");
                                      setSelectedParticipantId(null);
                                    }}
                                  >
                                    차단
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-mini-button"
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
                                  <div className="admin-table-move-list">
                                    {Array.from({ length: snapshot.session.tableCount }, (_, i) => i + 1)
                                      .filter((tid) => tid !== participant.tableId)
                                      .map((tid) => (
                                        <button
                                          key={tid}
                                          type="button"
                                          className="admin-mini-button admin-mini-button-table"
                                          onClick={() => {
                                            const confirmed = window.confirm(`참가자를 T${tid}로 이동할까요?`);
                                            if (!confirmed) {
                                              return;
                                            }
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
            eyebrow="하트/연락처 통계"
            title="하트 공개와 연락처 공유"
            description="공개/대기/완료 현황을 즉시 확인합니다."
          />
          {snapshot.contactExchangeStats ? (
            <div className="compact-stack">
              <div className="compact-row">
                <strong>하트 수</strong>
                <span>{snapshot.hearts.length}건</span>
              </div>
              <div className="compact-row">
                <strong>연락처 공유</strong>
                <span>
                  요청 {snapshot.contactExchangeStats.totalRequests} · 완료 {snapshot.contactExchangeStats.completedCount}
                </span>
              </div>
            </div>
          ) : null}
        </Surface>

        <Surface>
          <SectionHeader eyebrow="QR/보조 도구" title="현장 보조 기능" description="QR과 수동 하트 지급 도구입니다." />
          <SessionQrCard
            branchId={snapshot.session.branchId}
            tableCount={snapshot.session.tableCount}
          />
          <HeartGrantPanel
            snapshot={snapshot}
            onGrantHearts={grantHearts}
            onSetBlacklistStatus={setBlacklistStatus}
          />
        </Surface>
      </div>
    </div>
  );

  const renderHqDashboard = () => (
    <div className="admin-main-column">
      <div className="metric-grid admin-dashboard-metric-grid">
        <Surface className="metric-card">
          <strong>전체 지점</strong>
          <p className="metric-value">{branchNodes.length}</p>
        </Surface>
        <Surface className="metric-card">
          <strong>오늘 열린 회차</strong>
          <p className="metric-value">1</p>
        </Surface>
        <Surface className="metric-card">
          <strong>오늘 예약자</strong>
          <p className="metric-value">{snapshot.participants.length}명</p>
        </Surface>
        <Surface className="metric-card">
          <strong>오늘 체크인</strong>
          <p className="metric-value">{snapshot.participants.length}명</p>
        </Surface>
        <Surface className="metric-card">
          <strong>누적 방문자</strong>
          <p className="metric-value">{customerSummaries.length}명</p>
        </Surface>
        <Surface className="metric-card">
          <strong>운영 제한</strong>
          <p className="metric-value">{blacklistCount}명</p>
        </Surface>
      </div>

      <Surface>
        <SectionHeader eyebrow="지점별 오늘 현황" title="지점 운영 현황" description="현재 스냅샷 기준 지점별 요약입니다." />
        <div className="compact-stack">
          {branchNodes.map((branch) => (
            <div key={branch.branchId} className="compact-row">
              <strong>{branch.branchName}</strong>
              <span>
                회차 {branch.sessionName} · 참가자 {snapshot.participants.length}명 · 테이블 {snapshot.session.tableCount}
              </span>
            </div>
          ))}
        </div>
      </Surface>

      <Surface>
        <SectionHeader eyebrow="최근 운영 로그" title="최근 운영 로그" description="본부에서 최근 운영 이력을 확인합니다." />
        {snapshot.auditLogs.length > 0 ? (
          <div className="compact-stack">
            {snapshot.auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="compact-row">
                <strong>{log.action}</strong>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState title="운영 로그가 없습니다." description="로그가 생성되면 이곳에 표시됩니다." />}
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="주의 지점"
          title="주의가 필요한 항목"
          description="낮은 활동도/신고/운영 제한 상태를 빠르게 확인합니다."
        />
        <div className="compact-stack">
          <div className="compact-row">
            <strong>주의 테이블</strong>
            <span>{tableSummaries.filter((table) => table.tableState === "LOW_ACTIVITY").length}개</span>
          </div>
          <div className="compact-row">
            <strong>위험 테이블</strong>
            <span>{tableSummaries.filter((table) => table.tableState === "COLLAPSING").length}개</span>
          </div>
          <div className="compact-row">
            <strong>신고 대기</strong>
            <span>{unresolvedReports}건</span>
          </div>
        </div>
      </Surface>
    </div>
  );

  const renderCustomerDb = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="전체 고객 DB"
          title="누적 고객 관리 (준비 단계)"
          description="현재는 세션 데이터 기반 읽기 전용 구조입니다."
        />
        <p className="field-help">현재 세션 데이터로 표시 중이며, 누적 데이터가 연결되면 자동 확장됩니다.</p>
        <div className="compact-row">
          <input
            value={customerQuery}
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder="이름/전화번호/고객 ID 검색"
          />
        </div>
        <div className="button-row">
          {(["전체", "운영 제한", "재방문", "신고 연관"] as const).map((filter) => (
            <Button
              key={filter}
              variant={customerFilter === filter ? "primary" : "ghost"}
              onClick={() => setCustomerFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="고객 테이블"
          title="고객 요약"
          description="인기도 지표와 운영 추천은 운영 참고용 내부 정보입니다."
        />
        {filteredCustomerSummaries.length === 0 ? (
          <EmptyState title="누적 고객 데이터가 아직 없습니다." description="데이터가 쌓이면 여기에 표시됩니다." />
        ) : (
          <div className="admin-simple-table-wrap">
            <table className="admin-simple-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>전화번호</th>
                  <th>성별</th>
                  <th>나이</th>
                  <th>직업</th>
                  <th>방문</th>
                  <th>받은 하트</th>
                  <th>매칭</th>
                  <th>연락처 공유</th>
                  <th>인기도</th>
                  <th>추천</th>
                  <th>운영 제한</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerSummaries.slice(0, 100).map((customer) => (
                  <tr key={customer.customerId}>
                    <td>{customer.name}</td>
                    <td>{customer.phone ?? "-"}</td>
                    <td>{customer.gender}</td>
                    <td>{customer.age}</td>
                    <td>{customer.job}</td>
                    <td>{customer.totalVisitCount}</td>
                    <td>{customer.totalReceivedHearts}</td>
                    <td>{customer.totalMutualMatches}</td>
                    <td>{customer.totalContactExchanges}</td>
                    <td>{customer.globalPopularityScore ?? "누적 데이터 대기"}</td>
                    <td>{customer.branchProfiles[0]?.staffRecommendation.recommended ? "추천" : "미지정"}</td>
                    <td>{customer.isBlacklisted ? "운영 제한" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="추천/인기도 레이어"
          title="운영 추천 기준"
          description="고객 공개용이 아닌 운영 참고용 내부 레이어입니다."
        />
        <div className="compact-stack">
          <div className="compact-row">
            <strong>인기도 지표</strong>
            <span>누적 데이터가 쌓이면 자동 계산됩니다.</span>
          </div>
          <div className="compact-row">
            <strong>추천 등급</strong>
            <span>S / A / B / C (내부용)</span>
          </div>
          <div className="compact-row">
            <strong>추천 태그</strong>
            <span>{STAFF_RECOMMENDATION_TAGS.join(" · ")}</span>
          </div>
        </div>
      </Surface>
    </div>
  );

  const renderBranchDashboard = () => (
    <div className="admin-main-column">
      <div className="metric-grid admin-dashboard-metric-grid">
        <Surface className="metric-card"><strong>오늘 예약자</strong><p className="metric-value">{snapshot.participants.length}</p></Surface>
        <Surface className="metric-card"><strong>체크인 완료</strong><p className="metric-value">{snapshot.participants.length}</p></Surface>
        <Surface className="metric-card"><strong>남/여 비율</strong><p className="metric-value">{snapshot.participants.filter((p) => p.gender === "M").length}:{snapshot.participants.filter((p) => p.gender === "F").length}</p></Surface>
        <Surface className="metric-card"><strong>현재 열린 회차</strong><p className="metric-value">{snapshot.session.name}</p></Surface>
        <Surface className="metric-card"><strong>현재 참가자</strong><p className="metric-value">{snapshot.participants.length}</p></Surface>
        <Surface className="metric-card"><strong>신고/주의</strong><p className="metric-value">{unresolvedReports + blacklistCount}</p></Surface>
      </div>
      <Surface>
        <SectionHeader eyebrow="오늘 회차" title="현재 회차 정보" description="한 지점에서 동시에 OPEN 회차는 1개만 운영됩니다." />
        <div className="compact-stack">
          <div className="compact-row"><strong>회차</strong><span>{snapshot.session.name}</span></div>
          <div className="compact-row"><strong>단계</strong><span>{formatPhaseLabel(snapshot.session.phase)}</span></div>
          <div className="compact-row"><strong>테이블/정원</strong><span>{snapshot.session.tableCount} / {snapshot.session.tableCapacity}</span></div>
        </div>
      </Surface>
    </div>
  );

  const renderReservations = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader eyebrow="예약 현황" title="날짜/회차별 예약 현황" description="외부 연동 없이 CSV 수동 업로드로 운영할 수 있습니다." />
        <label className="field">
          <span>날짜 선택</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <div className="segmented">
          {(["1부", "2부", "1+2부"] as const).map((round) => (
            <button
              key={round}
              type="button"
              className={round === reservationRound ? "segmented-item segmented-item-active" : "segmented-item"}
              onClick={() => setReservationRound(round)}
            >
              {round}
            </button>
          ))}
        </div>
        <div className="compact-stack">
          <label className="field">
            <span>예약 CSV 업로드</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setReservationCsv(text);
                const parsed = parseManualReservationCsv(text);
                setReservationPreviewRows(parsed.rows);
                setReservationImportIssues(parsed.issues);
                setDuplicatePhones(parsed.duplicatePhones);
                setReservationImportApplied(false);
              }}
            />
          </label>
          <label className="field">
            <span>CSV 원문(직접 붙여넣기 가능)</span>
            <textarea
              rows={5}
              value={reservationCsv}
              onChange={(event) => setReservationCsv(event.target.value)}
              placeholder="필수 컬럼: 이름, 전화번호, 성별, 출생연도 or 나이, 예약일, 회차, 결제상태, 메모"
            />
          </label>
          <div className="button-row wrap-row">
            <Button
              onClick={() => {
                const parsed = parseManualReservationCsv(reservationCsv);
                setReservationPreviewRows(parsed.rows);
                setReservationImportIssues(parsed.issues);
                setDuplicatePhones(parsed.duplicatePhones);
                setReservationImportApplied(false);
              }}
              disabled={!reservationCsv.trim()}
            >
              업로드 미리보기
            </Button>
            <Button
              variant="secondary"
              disabled={reservationPreviewRows.length === 0 || reservationImportIssues.length > 0}
              onClick={async () => {
                const rows: ReservationBridgeRecord[] = reservationPreviewRows.map((row, index) => {
                  const gender: ParticipantGender | null =
                    row.gender === "남" || row.gender === "M"
                      ? "M"
                      : row.gender === "여" || row.gender === "F"
                      ? "F"
                      : null;
                  const birthYear = row.birthYear ? Number(row.birthYear) : null;
                  const age = row.age ? Number(row.age) : null;
                  return {
                  source: row.source ?? "CSV",
                  sessionId: snapshot.session.id,
                  branchId: snapshot.session.branchId,
                  eventId: snapshot.session.eventId,
                  eventDate: row.eventDate,
                  reservationId:
                    row.externalReservationId?.trim() ||
                    `${snapshot.session.id}-manual-${row.normalizedPhone || index + 1}`,
                  reservationExternalId: row.externalReservationId ?? null,
                  slot: row.slot,
                  name: row.name,
                  phone: row.phone,
                  normalizedPhone: row.normalizedPhone,
                  gender,
                  birthYear: Number.isFinite(birthYear) ? birthYear : null,
                  age: Number.isFinite(age) ? age : null,
                  paymentStatus: row.paymentStatus,
                  reservationStatus: row.reservationStatus,
                  checkinStatus: "PENDING" as const,
                  memo: row.memo ?? null,
                  rawRow: row.rawRow ?? null,
                  importedAt: row.importedAt,
                  status:
                    row.reservationStatus === "체크인 완료"
                      ? ("CHECKED_IN" as const)
                      : row.reservationStatus === "취소"
                      ? ("CANCELLED" as const)
                      : ("CONFIRMED" as const),
                  eligible: true
                  };
                });
                await getMingleRepository().executeCommand({
                  type: "admin.importReservations",
                  rows,
                  expectedVersion: snapshot.version
                });
                await syncFromRepository();
                setReservationImportApplied(true);
              }}
            >
              업로드 적용
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setReservationCsv("");
                setReservationPreviewRows([]);
                setReservationImportIssues([]);
                setDuplicatePhones([]);
                setReservationImportApplied(false);
              }}
            >
              업로드 초기화
            </Button>
            <Button variant="ghost" disabled>
              XLSX 업로드 (준비중)
            </Button>
          </div>
          {reservationImportApplied ? (
            <p className="field-help">
              예약 데이터가 세션에 반영되었습니다. 같은 전화번호/일자/회차 조합은 중복 적용되지 않습니다.
            </p>
          ) : null}
          {reservationImportIssues.length ? (
            <div className="compact-stack">
              {reservationImportIssues.slice(0, 5).map((issue) => (
                <p key={`${issue.row}-${issue.message}`} className="field-help">
                  {issue.row}행: {issue.message}
                </p>
              ))}
            </div>
          ) : null}
          {duplicatePhones.length ? (
            <p className="field-help">중복 전화번호: {duplicatePhones.join(", ")}</p>
          ) : null}
          {!reservationImportIssues.length && reservationPreviewRows.length > 0 ? (
            <p className="field-help">
              검증 통과: {reservationPreviewRows.length}건
              {persistedReservationRows.length > 0 ? ` / 현재 저장 ${persistedReservationRows.length}건` : ""}
            </p>
          ) : null}
        </div>
      </Surface>
      <div className="metric-grid admin-dashboard-metric-grid">
        <Surface className="metric-card"><strong>예약자</strong><p className="metric-value">{reservationRows.length || "-"}</p></Surface>
        <Surface className="metric-card"><strong>남자</strong><p className="metric-value">{reservationRows.filter((row) => row.gender === "남" || row.gender === "M").length || "-"}</p></Surface>
        <Surface className="metric-card"><strong>여자</strong><p className="metric-value">{reservationRows.filter((row) => row.gender === "여" || row.gender === "F").length || "-"}</p></Surface>
        <Surface className="metric-card"><strong>체크인 완료</strong><p className="metric-value">{reservationRows.filter((row) => row.reservationStatus === "체크인 완료" || row.paymentStatus === "체크인 완료").length || "-"}</p></Surface>
        <Surface className="metric-card"><strong>미입장</strong><p className="metric-value">{reservationRows.filter((row) => row.paymentStatus === "예약" || row.paymentStatus === "확정").length || "-"}</p></Surface>
        <Surface className="metric-card"><strong>취소/노쇼</strong><p className="metric-value">{reservationRows.filter((row) => row.paymentStatus === "취소" || row.paymentStatus === "노쇼").length || "-"}</p></Surface>
      </div>
      <Surface>
        <SectionHeader eyebrow="예약자 리스트" title="예약자 목록" description="예약 업로드는 참가자 생성이 아닌 입장 자격 검증 데이터로 사용됩니다." />
        {reservationRows.length === 0 ? (
          <EmptyState title="예약 데이터가 없습니다." description="CSV를 업로드하면 예약자 목록이 여기에 표시됩니다." />
        ) : (
          <div className="admin-simple-table-wrap">
            <table className="admin-simple-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>전화번호</th>
                  <th>성별</th>
                  <th>출생연도/나이</th>
                  <th>예약일</th>
                  <th>회차</th>
                  <th>결제상태</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {reservationRows.slice(0, 200).map((row, index) => (
                  <tr key={`${row.phone}-${index}`}>
                    <td>{row.name}</td>
                    <td>{row.phone}</td>
                    <td>{row.gender}</td>
                    <td>{row.birthYear || row.age || "-"}</td>
                    <td>{row.eventDate}</td>
                    <td>{row.slot}</td>
                    <td>{row.paymentStatus}</td>
                    <td>{row.memo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
      <Surface>
        <SectionHeader eyebrow="예약/결과 내보내기" title="CSV 내보내기" description="문자 자동화가 없어도 운영 후속 작업이 가능하도록 CSV로 내보냅니다." />
        <div className="button-row wrap-row">
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsvFile(
                "reservation-preview.csv",
                createCsvFromRows(
                  reservationRows.map((row) => ({
                    source: row.source,
                    externalReservationId: row.externalReservationId,
                    name: row.name,
                    phone: row.phone,
                    normalizedPhone: row.normalizedPhone,
                    gender: row.gender,
                    birthYear: row.birthYear,
                    age: row.age,
                    eventDate: row.eventDate,
                    slot: row.slot,
                    paymentStatus: row.paymentStatus,
                    reservationStatus: row.reservationStatus,
                    memo: row.memo
                  })),
                  [
                  "source",
                  "externalReservationId",
                  "name",
                  "phone",
                  "normalizedPhone",
                  "gender",
                  "birthYear",
                  "age",
                  "eventDate",
                  "slot",
                  "paymentStatus",
                  "reservationStatus",
                  "memo"
                  ]
                )
              )
            }
            disabled={reservationRows.length === 0}
          >
            예약자 목록 내보내기
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const checkedIn = snapshot.participants.map((participant) => ({
                name: participant.nickname,
                phone: participant.phone ?? "",
                gender: participant.gender,
                tableId: participant.tableId
              }));
              downloadCsvFile("checked-in.csv", createCsvFromRows(checkedIn, ["name", "phone", "gender", "tableId"]));
            }}
            disabled={snapshot.participants.length === 0}
          >
            체크인 완료자 내보내기
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const completed = (snapshot.contactExchanges ?? [])
                .filter((exchange) => exchange.status === "COMPLETED")
                .map((exchange) => ({
                  participantAId: exchange.participantAId,
                  participantBId: exchange.participantBId,
                  status: exchange.status,
                  completedAt: exchange.completedAt ?? ""
                }));
              downloadCsvFile(
                "contact-exchange-completed.csv",
                createCsvFromRows(completed, ["participantAId", "participantBId", "status", "completedAt"])
              );
            }}
            disabled={(snapshot.contactExchanges ?? []).filter((exchange) => exchange.status === "COMPLETED").length === 0}
          >
            연락처 공유 완료자 내보내기
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const noShow = reservationRows.filter(
                (row) => row.paymentStatus === "노쇼" || row.paymentStatus === "취소"
              );
              downloadCsvFile(
                "no-show-or-cancelled.csv",
                createCsvFromRows(
                  noShow.map((row) => ({
                    source: row.source,
                    externalReservationId: row.externalReservationId,
                    name: row.name,
                    phone: row.phone,
                    normalizedPhone: row.normalizedPhone,
                    gender: row.gender,
                    birthYear: row.birthYear,
                    age: row.age,
                    eventDate: row.eventDate,
                    slot: row.slot,
                    paymentStatus: row.paymentStatus,
                    reservationStatus: row.reservationStatus,
                    memo: row.memo
                  })),
                  [
                  "source",
                  "externalReservationId",
                  "name",
                  "phone",
                  "normalizedPhone",
                  "gender",
                  "birthYear",
                  "age",
                  "eventDate",
                  "slot",
                  "paymentStatus",
                  "reservationStatus",
                  "memo"
                  ]
                )
              );
            }}
            disabled={reservationRows.filter((row) => row.paymentStatus === "노쇼" || row.paymentStatus === "취소").length === 0}
          >
            미입장/노쇼 내보내기
          </Button>
        </div>
      </Surface>
    </div>
  );

  const renderSessionOverview = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader eyebrow="현재 회차" title="회차 현황" description="지점당 동시 OPEN 회차는 1개만 허용됩니다." />
        <div className="compact-stack">
          <div className="compact-row"><strong>회차명</strong><span>{snapshot.session.name}</span></div>
          <div className="compact-row"><strong>입장 시작</strong><span>{snapshot.session.sessionTimeLabel}</span></div>
          <div className="compact-row"><strong>시작 시간</strong><span>{snapshot.session.startedAt}</span></div>
          <div className="compact-row"><strong>종료 예정</strong><span>시작 후 12시간 자동 종료</span></div>
          <div className="compact-row"><strong>현재 단계</strong><span>{formatPhaseLabel(snapshot.session.phase)}</span></div>
          <div className="compact-row"><strong>참가자 수</strong><span>{snapshot.participants.length}</span></div>
          <div className="compact-row"><strong>테이블 수</strong><span>{snapshot.session.tableCount}</span></div>
          <div className="compact-row"><strong>하트 공개</strong><span>{snapshot.session.revealSenders ? "공개됨" : "비공개"}</span></div>
          <div className="compact-row"><strong>연락처 공유</strong><span>완료 {snapshot.contactExchangeStats?.completedCount ?? 0}건</span></div>
        </div>
        <div className="button-row">
          <Button onClick={() => setActivePage("branch-live")}>라이브 콘솔 열기</Button>
        </div>
      </Surface>
    </div>
  );

  const renderBranchSettings = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader eyebrow="지점 설정" title="기본 설정 (준비 단계)" description="현재는 기본값만 표시됩니다." />
        <div className="compact-stack">
          <div className="compact-row"><strong>기본 테이블 수</strong><span>{snapshot.session.tableCount}</span></div>
          <div className="compact-row"><strong>기본 테이블 정원</strong><span>{ADMIN_DEFAULT_CONFIG.tableCapacity}</span></div>
          <div className="compact-row"><strong>기본 하트 수</strong><span>{ADMIN_DEFAULT_CONFIG.initialHearts}</span></div>
          <div className="compact-row"><strong>회차 이동 제한</strong><span>{ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes}분</span></div>
          <div className="compact-row"><strong>장시간 미활동 기준</strong><span>{ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes}분</span></div>
          <div className="compact-row"><strong>기본 프로필 이미지</strong><span>{ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male}, {ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female}</span></div>
        </div>
      </Surface>
    </div>
  );

  const renderBranchCustomers = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="내 지점 고객 현황"
          title="지점 고객/참가자 현황"
          description="현재 지점 범위에서 운영 참고 지표를 확인합니다."
        />
      </Surface>
      <Surface>
        <SectionHeader
          eyebrow="수동 운영 제어"
          title="참가자 메모/추천 관리"
          description="민감한 평가/추천은 자동이 아닌 운영자 수동 입력만 허용합니다."
        />
        <label className="field">
          <span>참가자 선택</span>
          <select
            value={staffControlParticipantId}
            onChange={(event) => setStaffControlParticipantId(event.target.value)}
          >
            <option value="">참가자를 선택하세요</option>
            {snapshot.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.nickname} ({participant.id})
              </option>
            ))}
          </select>
        </label>
        {selectedStaffParticipant ? (
          <div className="compact-stack">
            <div className="compact-row">
              <strong>선택된 참가자</strong>
              <span>{selectedStaffParticipant.nickname}</span>
            </div>
            <label className="field">
              <span>추천 등급</span>
              <select
                value={staffGradeMap[selectedStaffParticipant.id] ?? ""}
                onChange={(event) =>
                  setStaffGradeMap((current) => ({
                    ...current,
                    [selectedStaffParticipant.id]: event.target.value as "S" | "A" | "B" | "C" | ""
                  }))
                }
              >
                <option value="">미지정</option>
                <option value="S">S</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </label>
            <div className="field">
              <span>추천 태그</span>
              <div className="chip-row">
                {STAFF_RECOMMENDATION_TAGS.map((tag) => {
                  const selected = (staffTagsMap[selectedStaffParticipant.id] ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={selected ? "chip chip-selected" : "chip"}
                      onClick={() => toggleStaffTag(selectedStaffParticipant.id, tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="field">
              <span>운영 메모</span>
              <textarea
                rows={3}
                value={staffMemoMap[selectedStaffParticipant.id] ?? ""}
                onChange={(event) =>
                  setStaffMemoMap((current) => ({
                    ...current,
                    [selectedStaffParticipant.id]: event.target.value
                  }))
                }
                placeholder="예: 지각했지만 대화 참여는 안정적"
              />
            </label>
            <p className="field-help">현재 단계는 UI 저장만 적용됩니다. 추후 CRM 저장소와 연결 예정입니다.</p>
          </div>
        ) : (
          <p className="field-help">참가자를 선택하면 등급/태그/메모를 입력할 수 있습니다.</p>
        )}
      </Surface>
      <Surface>
        <SectionHeader
          eyebrow="운영 로그"
          title="최근 조작 이력"
          description="누가 언제 무엇을 조작했는지 확인합니다."
        />
        {snapshot.auditLogs.length ? (
          <div className="compact-stack">
            {snapshot.auditLogs.slice(0, 12).map((log) => (
              <div key={log.id} className="compact-row">
                <strong>{log.action}</strong>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="운영 로그가 없습니다." description="조작 이력이 생성되면 여기에 표시됩니다." />
        )}
      </Surface>
      {renderCustomerDb()}
      <ReportsPanel
        snapshot={snapshot}
        onResolve={resolveReport}
        onSetBlacklistStatus={setBlacklistStatus}
      />
    </div>
  );

  const renderSection = () => {
    if (activePage === "hq-dashboard") return renderHqDashboard();
    if (activePage === "hq-customers") return renderCustomerDb();
    if (activePage === "hq-reservations") return renderReservations();
    if (activePage === "hq-admin-users") return <AdminUsersPanel />;
    if (activePage === "branch-dashboard") return renderBranchDashboard();
    if (activePage === "branch-reservations") return renderReservations();
    if (activePage === "branch-session") return renderSessionOverview();
    if (activePage === "branch-live") return renderLiveOps();
    if (activePage === "branch-customers") return renderBranchCustomers();
    return renderBranchSettings();
  };

  return (
    <main className="admin-shell">
      <div className="admin-console-layout">
        <aside className="admin-console-sidebar">
          <div className="admin-console-brand">
            <p className="eyebrow">운영 콘솔</p>
            <h2>본부 → 지점 → 회차 → 라이브</h2>
          </div>
          <nav className="admin-console-nav" aria-label="운영 메뉴">
            {isHqAdmin ? (
              <div className="admin-console-nav-group">
                <p className="admin-console-nav-group-title">본부</p>
                <div className="admin-console-nav-group-items">
                  <button type="button" className={activePage === "hq-dashboard" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-dashboard")}>본부 대시보드</button>
                  <button type="button" className={activePage === "hq-customers" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-customers")}>전체 고객 DB</button>
                  <button type="button" className={activePage === "hq-reservations" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-reservations")}>전체 예약 현황</button>
                  <button type="button" className={activePage === "hq-admin-users" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-admin-users")}>관리자 관리</button>
                </div>
              </div>
            ) : null}

            <div className="admin-console-nav-group">
              <p className="admin-console-nav-group-title">{isHqAdmin ? "지점" : "내 지점"}</p>
              {branchNodes.map((branch) => (
                <div key={branch.branchId} className="admin-branch-tree">
                  <button
                    type="button"
                    className={selectedBranch?.branchId === branch.branchId ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"}
                    onClick={() => {
                      setSelectedBranchId(branch.branchId);
                      setActivePage("branch-dashboard");
                    }}
                  >
                    {branch.branchName}
                  </button>
                  {selectedBranch?.branchId === branch.branchId ? (
                    <div className="admin-branch-tree-children">
                      <button type="button" className={activePage === "branch-dashboard" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-dashboard")}>지점 대시보드</button>
                      <button type="button" className={activePage === "branch-reservations" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-reservations")}>예약 현황</button>
                      <button type="button" className={activePage === "branch-session" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-session")}>세션</button>
                      <div className="admin-branch-tree-children">
                        <button type="button" className={activePage === "branch-live" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-live")}>라이브 콘솔</button>
                      </div>
                      <button type="button" className={activePage === "branch-customers" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-customers")}>참가자/고객 현황</button>
                      <button type="button" className={activePage === "branch-settings" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-settings")}>지점 설정</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </nav>
        </aside>

        <section className="admin-console-main">
          <Surface className="admin-console-topbar">
            <div className="admin-console-topbar-stack">
              {activePage.startsWith("hq-") ? (
                <div className="compact-row">
                  <strong>본부</strong>
                  <span>{getContextPageLabel(activePage)}</span>
                </div>
              ) : (
                <nav className="admin-console-breadcrumb" aria-label="본부 계층">
                  <ol className="admin-console-breadcrumb-list">
                    <li className="admin-console-breadcrumb-item"><span className="admin-console-breadcrumb-tier">본부</span></li>
                    <li className="admin-console-breadcrumb-sep">&gt;</li>
                    <li className="admin-console-breadcrumb-item"><span className="admin-console-breadcrumb-value">{selectedBranch?.branchName ?? snapshot.session.branchName}</span></li>
                    <li className="admin-console-breadcrumb-sep">&gt;</li>
                    <li className="admin-console-breadcrumb-item"><span className="admin-console-breadcrumb-value">{selectedBranch?.sessionName ?? snapshot.session.name}</span></li>
                    <li className="admin-console-breadcrumb-sep">&gt;</li>
                    <li className="admin-console-breadcrumb-item admin-console-breadcrumb-item-active"><span className="admin-console-breadcrumb-value">{getContextPageLabel(activePage)}</span></li>
                  </ol>
                </nav>
              )}
              <div className="admin-console-topbar-row">
                <div className="admin-console-topbar-meta">
                  <p>
                    <strong>권한</strong> {adminSession?.role ?? "미인증"}
                  </p>
                </div>
                <div className="badge-row">
                  <span className="badge badge-neutral">현재 단계 {formatPhaseLabel(snapshot.session.phase)}</span>
                  <span className="badge badge-neutral">참가자 {snapshot.participants.length}명</span>
                  <span className="badge badge-neutral">테이블 {snapshot.session.tableCount}</span>
                  <span className="badge badge-accent">{adminSession?.role ?? "권한 없음"}</span>
                </div>
                <div className="button-row wrap-row">
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
