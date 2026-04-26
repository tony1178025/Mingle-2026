"use client";

import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { maskPhoneNumber } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";

function formatReportStatusLabel(status: string) {
  if (status === "RESOLVED") return "처리 완료";
  if (status === "OPEN" || status === "NEW") return "확인 필요";
  if (status === "PENDING") return "대기";
  return status;
}

function formatIncidentTypeLabel(type: string) {
  if (type === "REPORT_SUBMITTED") return "신고 접수";
  if (type === "PARTICIPANT_MOVED") return "참가자 이동";
  if (type === "SESSION_STATE_CHANGED") return "세션 상태 변경";
  if (type === "CONTACT_EXCHANGE_UPDATED") return "연락처 교환 변경";
  if (type === "MANUAL_PARTICIPANT_CREATED") return "수동 참가자 등록";
  return type;
}

export function ReportsPanel({
  snapshot,
  onResolve,
  onSetBlacklistStatus
}: {
  snapshot: SessionSnapshot;
  onResolve: (reportId: string) => Promise<void>;
  onSetBlacklistStatus: (
    participantId: string,
    blocked: boolean,
    reason?: string
  ) => Promise<boolean>;
}) {
  const blacklist = snapshot.blacklist ?? [];
  const incidents = snapshot.incidents ?? [];

  return (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="신고"
          title="현장 신고 처리"
          description="라이브 운영 중 접수된 신고를 확인하고 바로 처리합니다."
        />
        {snapshot.reports.length ? (
          <div className="compact-stack">
            {snapshot.reports.map((report) => {
              const reporter = snapshot.participants.find((item) => item.id === report.reporterId);
              const target = snapshot.participants.find((item) => item.id === report.targetId);
              const blacklistEntry =
                snapshot.blacklist?.find((entry) => entry.participantId === report.targetId) ?? null;

              return (
                <div key={report.id} className="compact-row report-row">
                  <div>
                    <strong>
                      {reporter?.nickname ?? "이름 없음"} → {target?.nickname ?? "이름 없음"}
                    </strong>
                    <span>{report.reason}</span>
                    <span>{report.details}</span>
                    {target ? <span>참가자 ID: {target.id}</span> : null}
                    {target?.phone ? <span>전화번호: {maskPhoneNumber(target.phone)}</span> : null}
                    <span>상태: {blacklistEntry ? "운영 제한" : "활성"}</span>
                    {blacklistEntry ? <span>제한 사유: {blacklistEntry.reason}</span> : null}
                  </div>
                  <div className="badge-row">
                    <Badge tone={report.status === "RESOLVED" ? "success" : "warning"}>
                      {formatReportStatusLabel(report.status)}
                    </Badge>
                    {target ? (
                      <Button
                        variant={blacklistEntry ? "secondary" : "danger"}
                        onClick={() => {
                          const blocked = !blacklistEntry;
                          const confirmed = window.confirm(
                            blocked
                              ? "해당 참가자를 운영 제한 처리할까요?"
                              : "운영 제한을 해제할까요?"
                          );
                          if (!confirmed) {
                            return;
                          }
                          void onSetBlacklistStatus(
                            target.id,
                            blocked,
                            blacklistEntry ? undefined : `신고 사유: ${report.reason}`
                          );
                        }}
                      >
                        {blacklistEntry ? "차단 해제" : "차단"}
                      </Button>
                    ) : null}
                    {report.status !== "RESOLVED" ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const confirmed = window.confirm("이 신고를 처리 완료로 변경할까요?");
                          if (!confirmed) {
                            return;
                          }
                          void onResolve(report.id);
                        }}
                      >
                        처리 완료
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="신고가 없습니다." description="현재 처리할 신고가 없습니다." />
        )}
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="이력"
          title="리스크/사건 이력"
          description="운영 중 발생한 안전 관련 이력을 빠르게 확인합니다."
          actions={<Badge tone="accent">{incidents.length}</Badge>}
        />
        {incidents.length ? (
          <div className="compact-stack">
            {incidents.slice(0, 12).map((incident) => {
              const reporter = incident.reporterId
                ? snapshot.participants.find((item) => item.id === incident.reporterId)
                : null;
              const target = incident.targetId
                ? snapshot.participants.find((item) => item.id === incident.targetId)
                : null;
              const blacklistEntry = incident.targetId
                ? blacklist.find((entry) => entry.participantId === incident.targetId)
                : null;

              return (
                <div key={incident.id} className="compact-row report-row">
                  <div>
                    <strong>{formatIncidentTypeLabel(incident.type)}</strong>
                    <span>{incident.message}</span>
                    {reporter ? <span>신고자: {reporter.nickname} ({reporter.id})</span> : null}
                    {target ? <span>대상자: {target.nickname} ({target.id})</span> : null}
                    {target?.phone ? <span>전화번호: {maskPhoneNumber(target.phone)}</span> : null}
                    <span>상태: {blacklistEntry ? "운영 제한" : "활성"}</span>
                    <span>{incident.timestamp}</span>
                  </div>
                  <div className="badge-row">
                    <Badge tone={incident.type === "REPORT_SUBMITTED" ? "warning" : "accent"}>
                      {formatIncidentTypeLabel(incident.type)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="기록된 사건이 없습니다."
            description="현재 확인할 안전/리스크 이력이 없습니다."
          />
        )}
      </Surface>
    </div>
  );
}
