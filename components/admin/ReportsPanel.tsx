"use client";

import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { maskPhoneNumber } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";

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
          eyebrow="REPORTS"
          title="?꾩옣 ?좉퀬 泥섎━"
          description="?쇱씠釉??댁쁺?먭? 遊먯빞 ???좉퀬留??④린怨?諛붾줈 泥섎━?⑸땲??"
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
                      {reporter?.nickname ?? "?????놁쓬"} ??{target?.nickname ?? "?????놁쓬"}
                    </strong>
                    <span>{report.reason}</span>
                    <span>{report.details}</span>
                    {target ? <span>Participant ID: {target.id}</span> : null}
                    {target?.phone ? <span>Phone: {maskPhoneNumber(target.phone)}</span> : null}
                    <span>Status: {blacklistEntry ? "BLOCKED" : "ACTIVE"}</span>
                    {blacklistEntry ? <span>Block reason: {blacklistEntry.reason}</span> : null}
                  </div>
                  <div className="badge-row">
                    <Badge tone={report.status === "RESOLVED" ? "success" : "warning"}>
                      {report.status}
                    </Badge>
                    {target ? (
                      <Button
                        variant={blacklistEntry ? "secondary" : "danger"}
                        onClick={() =>
                          void onSetBlacklistStatus(
                            target.id,
                            !blacklistEntry,
                            blacklistEntry ? undefined : `신고 사유: ${report.reason}`
                          )
                        }
                      >
                        {blacklistEntry ? "차단 해제" : "차단"}
                      </Button>
                    ) : null}
                    {report.status !== "RESOLVED" ? (
                      <Button variant="secondary" onClick={() => void onResolve(report.id)}>
                        泥섎━ ?꾨즺
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="?좉퀬媛 ?놁뒿?덈떎." description="?꾩옱 泥섎━???덉쟾 ?댁뒋媛 ?놁뒿?덈떎." />
        )}
      </Surface>

      <Surface>
        <SectionHeader
          eyebrow="INCIDENTS"
          title="由ъ뒪?ы겕 / ?ъ빱 ?대젰"
          description="遺덉씠?곸쓣 ?깆떆????킃?덉젒 ?명뀥瑜?諛붾줈 ?뺤씤?⑸땲??"
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
                    <strong>{incident.type}</strong>
                    <span>{incident.message}</span>
                    {reporter ? <span>Reporter: {reporter.nickname} ({reporter.id})</span> : null}
                    {target ? <span>Target: {target.nickname} ({target.id})</span> : null}
                    {target?.phone ? <span>Phone: {maskPhoneNumber(target.phone)}</span> : null}
                    <span>Status: {blacklistEntry ? "BLOCKED" : "ACTIVE"}</span>
                    <span>{incident.timestamp}</span>
                  </div>
                  <div className="badge-row">
                    <Badge tone={incident.type === "REPORT_SUBMITTED" ? "warning" : "accent"}>
                      {incident.type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="湲곕줉???ъ빱???놁뒿?덈떎."
            description="?꾩옱 ?꾩뿭?먯꽌 蹂닿? ?명븷 ?꾩쟾 / 由ъ뒪?ы겕 ?덈젰???놁뒿?덈떎."
          />
        )}
      </Surface>
    </div>
  );
}
