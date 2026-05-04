 "use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { HeartGrantPanel } from "@/components/admin/HeartGrantPanel";
import { LiveOpsControls } from "@/components/admin/LiveOpsControls";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { SessionQrCard } from "@/components/admin/SessionQrCard";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import {
  createCsvFromRows,
  parseManualReservationCsv,
  type ManualReservationRow
} from "@/lib/reservations/manual-reservation";
import { parseFetchResponseJson } from "@/lib/api/parse-fetch-response";
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
  BranchRecord,
  CustomerProfileSummary,
  ManagedSessionRecord,
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
  | "branch-automation-center"
  | "branch-customers"
  | "branch-reports"
  | "branch-settings";

type BranchNode = {
  branchId: string;
  branchName: string;
  sessionName: string;
};

type SessionConfigDraft = {
  branchName: string;
  venueName: string;
  venueAddress: string;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  attendanceLabel: string;
  attendanceHint: string;
  tableCount: number;
  tableCapacity: number;
  initialHearts: number;
  rotationDeadlineMinutes: number;
  presenceGoneThresholdMinutes: number;
  defaultProfileImageMale: string;
  defaultProfileImageFemale: string;
  defaultProfileImageUnknown: string;
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
  if (page === "branch-automation-center") return "AI Automation Center";
  if (page === "branch-customers") return "참가자/고객 현황";
  if (page === "branch-reports") return "신고/제재";
  return "지점 설정";
}

function formatRoleLabel(role: AdminSessionRecord["role"] | undefined) {
  if (role === "HQ_ADMIN") return "본부 관리자";
  if (role === "BRANCH_ADMIN") return "지점 관리자";
  if (role === "STAFF") return "운영 스태프";
  return "미인증";
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
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sessionConfigDraft, setSessionConfigDraft] = useState<SessionConfigDraft>({
    branchName: "",
    venueName: "",
    venueAddress: "",
    sessionDateLabel: "",
    sessionTimeLabel: "",
    attendanceLabel: "",
    attendanceHint: "",
    tableCount: 1,
    tableCapacity: 1,
    initialHearts: ADMIN_DEFAULT_CONFIG.initialHearts,
    rotationDeadlineMinutes: ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes,
    presenceGoneThresholdMinutes: ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes,
    defaultProfileImageMale: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male,
    defaultProfileImageFemale: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female,
    defaultProfileImageUnknown: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.unknown
  });
  const [savingSessionConfig, setSavingSessionConfig] = useState(false);
  const [currentManagedSession, setCurrentManagedSession] = useState<ManagedSessionRecord | null>(null);
  const [anonymousMessageBusyId, setAnonymousMessageBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/branches", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await parseFetchResponseJson<{ branches?: BranchRecord[] }>(response);
        if (!active) return;
        setBranches(payload.branches ?? []);
      })
      .catch(() => {
        if (!active) return;
        setBranches([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    void fetch(`/api/admin/sessions/current?branchId=${snapshot.session.branchId}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        const payload = await parseFetchResponseJson<{ session: ManagedSessionRecord | null }>(response);
        return payload.session;
      })
      .then((session) => {
        setCurrentManagedSession(session ?? null);
      })
      .catch(() => {
        setCurrentManagedSession(null);
      });
  }, [snapshot?.session.branchId, snapshot?.version]);

  const createSession = async () => {
    if (!snapshot) return;
    const title = `${new Date().toISOString().slice(0, 10)} 회차`;
    await fetch("/api/admin/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        name: title,
        branchId: snapshot.session.branchId,
        eventId: snapshot.session.eventId,
        venueName: snapshot.session.venueName,
        venueAddress: snapshot.session.venueAddress,
        sessionDateLabel: snapshot.session.sessionDateLabel,
        sessionTimeLabel: snapshot.session.sessionTimeLabel,
        attendanceLabel: snapshot.session.attendanceLabel,
        attendanceHint: snapshot.session.attendanceHint,
        code: snapshot.session.code,
        tableCount: snapshot.session.tableCount,
        tableCapacity: snapshot.session.tableCapacity,
        maxCapacity: snapshot.session.tableCount * snapshot.session.tableCapacity,
        status: "OPEN"
      })
    });
    await syncFromRepository();
  };

  const postSessionLifecycle = async (action: "start" | "round-2" | "close" | "archive") => {
    if (!currentManagedSession) return;
    await fetch(`/api/admin/sessions/${currentManagedSession.id}/${action}`, {
      method: "POST",
      headers: { Accept: "application/json" }
    });
    await syncFromRepository();
  };

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

  useEffect(() => {
    if (!snapshot) return;
    setSessionConfigDraft({
      branchName: snapshot.session.branchName,
      venueName: snapshot.session.venueName,
      venueAddress: snapshot.session.venueAddress,
      sessionDateLabel: snapshot.session.sessionDateLabel,
      sessionTimeLabel: snapshot.session.sessionTimeLabel,
      attendanceLabel: snapshot.session.attendanceLabel,
      attendanceHint: snapshot.session.attendanceHint,
      tableCount: snapshot.session.tableCount,
      tableCapacity: snapshot.session.tableCapacity,
      initialHearts:
        snapshot.session.operationalConfig?.initialHearts ?? ADMIN_DEFAULT_CONFIG.initialHearts,
      rotationDeadlineMinutes:
        snapshot.session.operationalConfig?.rotationDeadlineMinutes ??
        ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes,
      presenceGoneThresholdMinutes:
        snapshot.session.operationalConfig?.presenceGoneThresholdMinutes ??
        ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes,
      defaultProfileImageMale:
        snapshot.session.operationalConfig?.defaultProfileImagePaths?.male ??
        ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male,
      defaultProfileImageFemale:
        snapshot.session.operationalConfig?.defaultProfileImagePaths?.female ??
        ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female,
      defaultProfileImageUnknown:
        snapshot.session.operationalConfig?.defaultProfileImagePaths?.unknown ??
        ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.unknown
    });
  }, [snapshot]);

  const isHqAdmin = adminSession?.role === "HQ_ADMIN";
  const isBranchScoped = adminSession?.role === "BRANCH_ADMIN" || adminSession?.role === "STAFF";
  const branchNodes = useMemo<BranchNode[]>(() => {
    if (!snapshot) return [];
    const fallbackNode = {
      branchId: snapshot.session.branchId,
      branchName: snapshot.session.branchName || snapshot.session.branchId,
      sessionName: snapshot.session.name
    };
    const dynamicNodes =
      branches.length > 0
        ? branches
            .filter((branch) => branch.isActive)
            .map((branch) => ({
              branchId: branch.id,
              branchName: branch.name,
              sessionName: branch.id === snapshot.session.branchId ? snapshot.session.name : "세션 대기"
            }))
        : [fallbackNode];
    const nodes = dynamicNodes.some((node) => node.branchId === fallbackNode.branchId)
      ? dynamicNodes
      : [fallbackNode, ...dynamicNodes];
    if (isBranchScoped && adminSession?.branchId) {
      return nodes.filter((node) => node.branchId === adminSession.branchId);
    }
    return nodes;
  }, [adminSession?.branchId, branches, isBranchScoped, snapshot]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchNodes[0]?.branchId ?? "");
  const selectedBranch = branchNodes.find((node) => node.branchId === selectedBranchId) ?? branchNodes[0] ?? null;
  const [activePage, setActivePage] = useState<AdminPageKey>(isHqAdmin ? "hq-dashboard" : "branch-dashboard");
  useEffect(() => {
    if (!selectedBranchId && branchNodes[0]?.branchId) {
      setSelectedBranchId(branchNodes[0].branchId);
      return;
    }
    if (selectedBranchId && !branchNodes.some((node) => node.branchId === selectedBranchId)) {
      setSelectedBranchId(branchNodes[0]?.branchId ?? "");
    }
  }, [branchNodes, selectedBranchId]);
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

  const maleParticipants = snapshot?.participants.filter((participant) => participant.gender === "M").length ?? 0;
  const femaleParticipants = snapshot?.participants.filter((participant) => participant.gender === "F").length ?? 0;
  const reservationByDate = useMemo(() => {
    const map = new Map<string, { male: number; female: number; total: number }>();
    for (const row of reservationRows) {
      const key = row.eventDate || selectedDate;
      const prev = map.get(key) ?? { male: 0, female: 0, total: 0 };
      const isMale = row.gender === "남" || row.gender === "M";
      const isFemale = row.gender === "여" || row.gender === "F";
      map.set(key, {
        male: prev.male + (isMale ? 1 : 0),
        female: prev.female + (isFemale ? 1 : 0),
        total: prev.total + 1
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 42);
  }, [reservationRows, selectedDate]);

  if (!hydrated) {
    return (
      <main className="admin-shell">
        <div className="admin-stage">
          <Surface>
            <EmptyState title="불러오는 중" description="세션과 지점 정보를 준비하고 있어요." />
            <div className="admin-loading-skeleton" aria-hidden>
              <div className="skeleton-block" />
              <div className="skeleton-block skeleton-block-short" />
            </div>
          </Surface>
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
              title="세션을 불러오지 못했어요"
              description={
                snapshotLoadErrorCode === "SESSION_SNAPSHOT_LOAD_FAILED"
                  ? "이 지점에 열린 회차가 없습니다. 세션을 시작했는지 확인하거나 페이지를 새로고침해 주세요."
                  : "네트워크 또는 권한 문제일 수 있어요. 새로고침 후에도 같으면 본부에 문의해 주세요."
              }
            />
            {snapshotLoadErrorCode ? (
              <p className="field-help admin-error-code">오류 코드: {snapshotLoadErrorCode}</p>
            ) : null}
          </Surface>
        </div>
      </main>
    );
  }

  const anonymousMessages = snapshot.anonymousMessages.filter(
    (message) => message.sessionId === snapshot.session.id
  );
  const selectedAnonymousMessages = anonymousMessages.filter((message) => message.isSelected);
  const tablePickWindows = snapshot.tablePickWindows ?? [];
  const tablePickSummary = {
    rotationIndex0: new Set(
      (snapshot.tableImpressionPicks ?? [])
        .filter((pick) => pick.rotationIndex === 0 && pick.sessionId === snapshot.session.id)
        .map((pick) => pick.pickerParticipantId)
    ).size,
    rotationIndex1: new Set(
      (snapshot.tableImpressionPicks ?? [])
        .filter((pick) => pick.rotationIndex === 1 && pick.sessionId === snapshot.session.id)
        .map((pick) => pick.pickerParticipantId)
    ).size
  };

  const updateAnonymousMessageSelection = async (messageId: string, isSelected: boolean) => {
    setAnonymousMessageBusyId(messageId);
    try {
      await getMingleRepository().executeCommand({
        type: "admin.updateAnonymousMessageSelection",
        messageId,
        isSelected,
        expectedVersion: snapshot.version
      });
      await syncFromRepository();
    } finally {
      setAnonymousMessageBusyId(null);
    }
  };

  const renderLiveOps = () => (
    <div className="admin-grid" data-testid="admin-live-ops-grid">
      <div data-testid="admin-live-ops-session-panel">
      <LiveOpsControls
        snapshot={snapshot}
        revealReadyCount={revealReadyCount}
        phaseLabel={formatPhaseLabel(snapshot.session.phase)}
        onSetSessionState={setSessionState}
        onTriggerReveal={triggerReveal}
        onPublishAnnouncement={publishAnnouncement}
      />
      </div>
      <div className="admin-side-column">
        <Surface data-testid="admin-live-ops-tables-panel">
          <SectionHeader
            eyebrow="주의"
            title="운영 주의 신호"
            description="테이블·참여 흐름에서 먼저 살펴볼 항목입니다."
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
            <EmptyState title="주의 항목이 없습니다." description="현재 즉시 개입이 필요한 항목이 없습니다." />
          )}
        </Surface>

        <Surface data-testid="admin-live-ops-participants-panel">
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
                      {warning ? <AlertTriangle size={16} strokeWidth={1.8} style={{ transform: "translateY(1px)" }} /> : null}
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

        <Surface data-testid="admin-live-ops-content-panel">
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

        <Surface data-testid="admin-live-ops-content-picks-panel">
          <SectionHeader eyebrow="QR/보조 도구" title="현장 보조 기능" description="QR과 수동 하트 지급 도구입니다." />
          <SessionQrCard
            branchId={snapshot.session.branchId}
            tableCount={snapshot.session.tableCount}
            sessionId={snapshot.session.id}
          />
          <HeartGrantPanel
            snapshot={snapshot}
            onGrantHearts={grantHearts}
            onSetBlacklistStatus={setBlacklistStatus}
          />
        </Surface>
        <Surface data-testid="admin-live-ops-content-messages-panel">
          <SectionHeader eyebrow="콘텐츠" title="테이블 픽" description="회차별 제출 현황" />
          <div className="compact-stack">
            <div className="compact-row">
              <strong>윈도우 상태</strong>
              <span>
                {tablePickWindows.length
                  ? tablePickWindows.map((window) => `R${window.rotationIndex}:${window.status}`).join(" / ")
                  : "없음"}
              </span>
            </div>
            <div className="compact-row">
              <strong>R0 제출</strong>
              <span>{tablePickSummary.rotationIndex0} / {snapshot.participants.length}</span>
            </div>
            <div className="compact-row">
              <strong>R1 제출</strong>
              <span>{tablePickSummary.rotationIndex1} / {snapshot.participants.length}</span>
            </div>
          </div>
        </Surface>
        <Surface data-testid="admin-live-ops-content-selected-messages-panel">
          <SectionHeader eyebrow="콘텐츠" title="익명 메시지" description="메시지 수집/선별" />
          <p className="field-help">메시지는 최대 2개까지 작성할 수 있습니다</p>
          {anonymousMessages.length ? (
            <div className="compact-stack">
              {anonymousMessages.slice(0, 20).map((message) => {
                const sender = snapshot.participants.find((p) => p.id === message.senderParticipantId);
                const receiver = message.receiverParticipantId
                  ? snapshot.participants.find((p) => p.id === message.receiverParticipantId)
                  : null;
                const busy = anonymousMessageBusyId === message.id;
                return (
                  <div key={message.id} className="compact-stack">
                    <div className="compact-row"><strong>시간</strong><span>{new Date(message.createdAt).toLocaleTimeString("ko-KR")}</span></div>
                    <div className="compact-row"><strong>받는 사람</strong><span>{receiver?.nickname ?? "-"}</span></div>
                    <div className="compact-row"><strong>특징</strong><span>{message.receiverHint ?? "-"}</span></div>
                    <div className="compact-row"><strong>메시지</strong><span>{message.message}</span></div>
                    <div className="compact-row"><strong>보낸 사람</strong><span>{message.revealSender ? (sender?.nickname ?? "알 수 없음") : "익명"}</span></div>
                    <div className="compact-row"><strong>선택 여부</strong><span>{message.isSelected ? "선택됨" : "미선택"}</span></div>
                    <div className="button-row">
                      <Button
                        disabled={busy}
                        onClick={() => void updateAnonymousMessageSelection(message.id, true)}
                      >
                        선택
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void updateAnonymousMessageSelection(message.id, false)}
                      >
                        해제
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="도착한 메시지가 없습니다." description="새 메시지는 여기에 실시간으로 누적됩니다." />
          )}
        </Surface>
        <Surface>
          <SectionHeader eyebrow="MC 큐" title="선택된 메시지" description="오프라인 진행용 읽기 리스트" />
          {selectedAnonymousMessages.length ? (
            <div className="compact-stack">
              {selectedAnonymousMessages.map((message, index) => (
                <div key={message.id} className="compact-row">
                  <strong>{index + 1}</strong>
                  <span>{message.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="선택된 메시지가 없습니다." description="메시지를 선택하면 MC 큐에 추가됩니다." />
          )}
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
        <SectionHeader eyebrow="세션" title="현재 세션" description={currentManagedSession ? "" : "열린 세션 없음"} />
        <div className="compact-stack">
          <div className="compact-row"><strong>회차</strong><span>{snapshot.session.name}</span></div>
          <div className="compact-row"><strong>상태</strong><span>{formatPhaseLabel(snapshot.session.phase)}</span></div>
          <div className="compact-row"><strong>참가자</strong><span>{snapshot.participants.length ? `${snapshot.participants.length}명` : "참가자 없음"}</span></div>
          <div className="button-row wrap-row">
            <Button onClick={() => void createSession()}>새 세션 생성</Button>
            <Button variant="secondary" onClick={() => void postSessionLifecycle("start")}>세션 시작</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!window.confirm("ROUND_2로 전환할까요?")) return;
                void postSessionLifecycle("round-2");
              }}
            >
              ROUND_2 전환
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!window.confirm("세션을 종료할까요?")) return;
                void postSessionLifecycle("close");
              }}
            >
              세션 종료
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!window.confirm("세션을 archive 처리할까요?")) return;
                void postSessionLifecycle("archive");
              }}
            >
              세션 archive
            </Button>
          </div>
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
        <div className="reservation-calendar-grid">
          {reservationByDate.length > 0 ? (
            reservationByDate.map(([dateKey, stats]) => (
              <button
                key={dateKey}
                type="button"
                className={dateKey === selectedDate ? "reservation-calendar-cell reservation-calendar-cell-active" : "reservation-calendar-cell"}
                onClick={() => setSelectedDate(dateKey)}
              >
                <strong>{dateKey}</strong>
                <span>남 {stats.male} / 여 {stats.female}</span>
                <span>총 {stats.total}명</span>
              </button>
            ))
          ) : (
            <p className="field-help">캘린더 데이터가 없습니다. CSV를 업로드해 주세요.</p>
          )}
        </div>
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
                {reservationRows
                  .filter((row) => row.eventDate === selectedDate && row.slot === reservationRound)
                  .slice(0, 200)
                  .map((row, index) => (
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
      <div className="metric-grid admin-dashboard-metric-grid">
        <Surface className="metric-card"><strong>참가자</strong><p className="metric-value">{snapshot.participants.length}명</p></Surface>
        <Surface className="metric-card"><strong>남/여</strong><p className="metric-value">{maleParticipants} / {femaleParticipants}</p></Surface>
        <Surface className="metric-card"><strong>테이블</strong><p className="metric-value">{snapshot.session.tableCount}개</p></Surface>
        <Surface className="metric-card"><strong>진행 상태</strong><p className="metric-value">{formatPhaseLabel(snapshot.session.phase)}</p></Surface>
      </div>

      <Surface>
        <SectionHeader eyebrow="테이블 상태" title="테이블 운영 카드" description="리스트가 아닌 카드로 테이블 상태를 즉시 파악합니다." />
        <div className="admin-table-grid">
          {tableSummaries.map((table) => {
            const maleCount = table.participants.filter((participant) => participant.gender === "M").length;
            const femaleCount = table.participants.filter((participant) => participant.gender === "F").length;
            const reactionS = table.participants.filter((participant) => participant.receivedHearts >= 4).length;
            const reactionA = table.participants.filter((participant) => participant.receivedHearts >= 2 && participant.receivedHearts < 4).length;
            const reactionB = table.participants.filter((participant) => participant.receivedHearts < 2).length;
            return (
              <Surface key={table.tableId} className="ops-table-card">
                <div className="ops-table-head">
                  <strong>{formatTableName(table.tableId)}</strong>
                  <Badge tone={table.tableState === "COLLAPSING" ? "warning" : "neutral"}>
                    {table.tableState === "COLLAPSING" ? "주의 필요" : "안정"}
                  </Badge>
                </div>
                <div className="ops-table-meta">
                  <span>남 {maleCount}</span>
                  <span>여 {femaleCount}</span>
                  <span>S:{reactionS} / A:{reactionA} / B:{reactionB}</span>
                </div>
              </Surface>
            );
          })}
        </div>
      </Surface>

      <Surface>
        <SectionHeader eyebrow="참가자 목록" title="운영 참가자 테이블" description="이름/나이/테이블/하트/상태/액션을 한 화면에서 처리합니다." />
        <div className="admin-simple-table-wrap">
          <table className="admin-simple-table">
            <thead>
              <tr>
                <th>이름</th>
                <th data-col-type="number">나이</th>
                <th data-col-type="number">테이블</th>
                <th data-col-type="number">하트 받은 수</th>
                <th data-col-type="status">상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.participants.map((participant) => {
                const status = snapshot.participantStatusMap?.[participant.id] ?? "IDLE";
                return (
                  <tr key={participant.id}>
                    <td>{participant.nickname}</td>
                    <td data-col-type="number">{participant.age}</td>
                    <td data-col-type="number">T{participant.tableId}</td>
                    <td data-col-type="number">{participant.receivedHearts}</td>
                    <td data-col-type="status">{formatParticipantStatusLabel(status)}</td>
                    <td>
                      <div className="button-row">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setMovingParticipantId(movingParticipantId === participant.id ? null : participant.id)
                          }
                        >
                          이동
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            const confirmed = window.confirm("해당 참가자를 운영 제한할까요?");
                            if (!confirmed) return;
                            void setBlacklistStatus(participant.id, true, "운영 제한");
                          }}
                        >
                          차단
                        </Button>
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
                                  if (!confirmed) return;
                                  void moveParticipant(participant.id, tid).then(() => setMovingParticipantId(null));
                                }}
                              >
                                T{tid}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );

  const renderBranchSettings = () => (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="지점 설정"
          title="운영 설정"
          description="저장 즉시 서버 스냅샷에 반영되며 Admin/고객 화면 동기화에 사용됩니다."
        />
        <form
          className="compact-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (savingSessionConfig) {
              return;
            }
            const confirmed = window.confirm("운영 설정을 저장할까요?");
            if (!confirmed) {
              return;
            }
            setSavingSessionConfig(true);
            void getMingleRepository()
              .executeCommand({
                type: "admin.updateSessionConfig",
                config: {
                  branchName: sessionConfigDraft.branchName,
                  venueName: sessionConfigDraft.venueName,
                  venueAddress: sessionConfigDraft.venueAddress,
                  sessionDateLabel: sessionConfigDraft.sessionDateLabel,
                  sessionTimeLabel: sessionConfigDraft.sessionTimeLabel,
                  attendanceLabel: sessionConfigDraft.attendanceLabel,
                  attendanceHint: sessionConfigDraft.attendanceHint,
                  tableCount: Number(sessionConfigDraft.tableCount),
                  tableCapacity: Number(sessionConfigDraft.tableCapacity),
                  initialHearts: Number(sessionConfigDraft.initialHearts),
                  rotationDeadlineMinutes: Number(sessionConfigDraft.rotationDeadlineMinutes),
                  presenceGoneThresholdMinutes: Number(sessionConfigDraft.presenceGoneThresholdMinutes),
                  defaultProfileImageMale: sessionConfigDraft.defaultProfileImageMale,
                  defaultProfileImageFemale: sessionConfigDraft.defaultProfileImageFemale,
                  defaultProfileImageUnknown: sessionConfigDraft.defaultProfileImageUnknown
                },
                expectedVersion: snapshot.version
              })
              .then(async () => {
                await syncFromRepository();
                window.alert("운영 설정을 저장했습니다.");
              })
              .catch((error) => {
                const message = error instanceof Error ? error.message : "설정 저장에 실패했습니다.";
                window.alert(message);
              })
              .finally(() => {
                setSavingSessionConfig(false);
              });
          }}
        >
          <label className="field">
            <span>지점명</span>
            <input
              value={sessionConfigDraft.branchName}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, branchName: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>장소명</span>
            <input
              value={sessionConfigDraft.venueName}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, venueName: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>장소 주소</span>
            <input
              value={sessionConfigDraft.venueAddress}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, venueAddress: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>세션 날짜 라벨</span>
            <input
              value={sessionConfigDraft.sessionDateLabel}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, sessionDateLabel: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>세션 시간 라벨</span>
            <input
              value={sessionConfigDraft.sessionTimeLabel}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, sessionTimeLabel: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>참여 현황 라벨</span>
            <input
              value={sessionConfigDraft.attendanceLabel}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, attendanceLabel: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>운영 힌트 문구</span>
            <textarea
              rows={3}
              value={sessionConfigDraft.attendanceHint}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({ ...current, attendanceHint: event.target.value }))
              }
            />
          </label>
          <div className="admin-two-col">
            <label className="field">
              <span>테이블 수</span>
              <input
                type="number"
                min={1}
                value={sessionConfigDraft.tableCount}
                onChange={(event) =>
                  setSessionConfigDraft((current) => ({
                    ...current,
                    tableCount: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>
            <label className="field">
              <span>테이블 정원</span>
              <input
                type="number"
                min={1}
                value={sessionConfigDraft.tableCapacity}
                onChange={(event) =>
                  setSessionConfigDraft((current) => ({
                    ...current,
                    tableCapacity: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>
          </div>
          <div className="admin-two-col">
            <label className="field">
              <span>기본 하트 수</span>
              <input
                type="number"
                min={0}
                value={sessionConfigDraft.initialHearts}
                onChange={(event) =>
                  setSessionConfigDraft((current) => ({
                    ...current,
                    initialHearts: Math.max(0, Number(event.target.value) || 0)
                  }))
                }
              />
            </label>
            <label className="field">
              <span>회차 이동 제한(분)</span>
              <input
                type="number"
                min={1}
                value={sessionConfigDraft.rotationDeadlineMinutes}
                onChange={(event) =>
                  setSessionConfigDraft((current) => ({
                    ...current,
                    rotationDeadlineMinutes: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>
          </div>
          <label className="field">
            <span>장시간 미활동 기준(분)</span>
            <input
              type="number"
              min={1}
              value={sessionConfigDraft.presenceGoneThresholdMinutes}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({
                  ...current,
                  presenceGoneThresholdMinutes: Math.max(1, Number(event.target.value) || 1)
                }))
              }
            />
          </label>
          <label className="field">
            <span>기본 아바타 경로(남)</span>
            <input
              value={sessionConfigDraft.defaultProfileImageMale}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({
                  ...current,
                  defaultProfileImageMale: event.target.value
                }))
              }
            />
          </label>
          <label className="field">
            <span>기본 아바타 경로(여)</span>
            <input
              value={sessionConfigDraft.defaultProfileImageFemale}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({
                  ...current,
                  defaultProfileImageFemale: event.target.value
                }))
              }
            />
          </label>
          <label className="field">
            <span>기본 아바타 경로(미확인)</span>
            <input
              value={sessionConfigDraft.defaultProfileImageUnknown}
              onChange={(event) =>
                setSessionConfigDraft((current) => ({
                  ...current,
                  defaultProfileImageUnknown: event.target.value
                }))
              }
            />
          </label>
          <div className="button-row">
            <Button type="submit" disabled={savingSessionConfig}>
              {savingSessionConfig ? "저장 중..." : "운영 설정 저장"}
            </Button>
          </div>
        </form>
        <div className="compact-stack" style={{ marginTop: 16 }}>
          <div className="compact-row"><strong>기본 하트 수</strong><span>{snapshot.session.operationalConfig?.initialHearts ?? ADMIN_DEFAULT_CONFIG.initialHearts}</span></div>
          <div className="compact-row"><strong>회차 이동 제한</strong><span>{snapshot.session.operationalConfig?.rotationDeadlineMinutes ?? ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes}분</span></div>
          <div className="compact-row"><strong>장시간 미활동 기준</strong><span>{snapshot.session.operationalConfig?.presenceGoneThresholdMinutes ?? ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes}분</span></div>
          <div className="compact-row"><strong>기본 프로필 이미지</strong><span>{snapshot.session.operationalConfig?.defaultProfileImagePaths?.male ?? ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male}, {snapshot.session.operationalConfig?.defaultProfileImagePaths?.female ?? ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female}</span></div>
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

  const renderBranchReports = () => (
    <ReportsPanel
      snapshot={snapshot}
      onResolve={resolveReport}
      onSetBlacklistStatus={setBlacklistStatus}
    />
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
    if (activePage === "branch-reports") return renderBranchReports();
    if (activePage === "branch-automation-center") {
      return (
        <Surface>
          <SectionHeader
            eyebrow="AI Automation Center"
            title="설계 구조 등록 완료"
            description="이번 주는 설계 등록만 수행합니다. OpenClaw/AI 자동응답/자동발송/환불 자동화는 구현하지 않습니다."
          />
          <p className="field-help">
            문서: docs/ai-automation/README.md, docs/ai-automation/architecture.md
          </p>
          <p className="field-help">
            스키마 초안: db/automation-schema-draft.sql
          </p>
        </Surface>
      );
    }
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
                  <button type="button" className={activePage === "hq-reservations" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-reservations")}>전체 예약 현황</button>
                  <button type="button" className={activePage === "hq-customers" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("hq-customers")}>전체 고객 DB</button>
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
                      <button type="button" className={activePage === "branch-session" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-session")}>세션</button>
                      <div className="admin-branch-tree-children">
                        <button type="button" className={activePage === "branch-live" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-live")}>라이브 콘솔</button>
                      </div>
                      <button type="button" className={activePage === "branch-reservations" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-reservations")}>예약 현황</button>
                      <button type="button" className={activePage === "branch-customers" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-customers")}>고객 현황</button>
                      <button type="button" className={activePage === "branch-reports" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-reports")}>신고/제재</button>
                      <button type="button" className={activePage === "branch-automation-center" ? "admin-console-nav-item admin-console-nav-item-active" : "admin-console-nav-item"} onClick={() => setActivePage("branch-automation-center")}>AI Automation Center</button>
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
                    <strong>권한</strong> {formatRoleLabel(adminSession?.role)}
                  </p>
                </div>
                <div className="badge-row">
                  <span className="badge badge-neutral">현재 단계 {formatPhaseLabel(snapshot.session.phase)}</span>
                  <span className="badge badge-neutral">참가자 {snapshot.participants.length}명</span>
                  <span className="badge badge-neutral">테이블 {snapshot.session.tableCount}</span>
                  <span className="badge badge-accent">{formatRoleLabel(adminSession?.role)}</span>
                </div>
                <div className="button-row wrap-row">
                  <Button variant="secondary" onClick={() => void syncFromRepository()}>
                    새로고침
                  </Button>
                  <Button variant="ghost" onClick={() => (window.location.href = "/customer")}>
                    고객 화면
                  </Button>
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
