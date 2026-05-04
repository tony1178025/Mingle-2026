"use client";

import { useMemo, useState } from "react";
import { Badge, Button, SectionHeader, Surface } from "@/components/shared/ui";
import { formatTableName, maskPhoneNumber, normalizePhoneNumber } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";

const QUICK_AMOUNTS = [1, 3, 5] as const;

export function HeartGrantPanel({
  snapshot,
  onGrantHearts,
  onSetBlacklistStatus
}: {
  snapshot: SessionSnapshot;
  onGrantHearts: (participantId: string, heartsToAdd: number) => Promise<boolean>;
  onSetBlacklistStatus: (
    participantId: string,
    blocked: boolean,
    reason?: string
  ) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const matches = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const phoneKeyword = normalizePhoneNumber(query);
    const pool = keyword
      ? snapshot.participants.filter((participant) => {
          const reservationId = participant.reservationId?.toLowerCase() ?? "";
          const participantPhone = normalizePhoneNumber(participant.phone) ?? "";

          return (
            participant.nickname.toLowerCase().includes(keyword) ||
            participant.id.toLowerCase().includes(keyword) ||
            reservationId.includes(keyword) ||
            (phoneKeyword ? participantPhone.includes(phoneKeyword) : false)
          );
        })
      : snapshot.participants;

    return pool
      .slice()
      .sort((left, right) => {
        const leftName = (left.nickname ?? left.id ?? "").toString();
        const rightName = (right.nickname ?? right.id ?? "").toString();
        return leftName.localeCompare(rightName, "ko");
      })
      .slice(0, 8);
  }, [query, snapshot.participants]);

  return (
    <Surface>
      <SectionHeader
        eyebrow="하트"
        title="하트 수동 지급"
        description="닉네임 중복 상황에서도 participantId, reservationId, 상태를 함께 보고 운영자가 직접 지급합니다."
      />

      <label className="field">
        <span>참가자 검색</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="닉네임, participantId, reservationId, 전화번호"
        />
      </label>

      <div className="compact-stack">
        {matches.map((participant) => {
          const blacklistEntry =
            snapshot.blacklist?.find((entry) => entry.participantId === participant.id) ?? null;
          const blocked = Boolean(blacklistEntry);

          return (
            <div key={participant.id} className="participant-card">
              <div className="participant-head">
                <div className="participant-copy">
                  <strong>{participant.nickname}</strong>
                  <p>
                    {formatTableName(participant.tableId)} · 남은 하트 {participant.heartsRemaining}
                  </p>
                  <p>참가자 ID: {participant.id}</p>
                  <p>예약 ID: {participant.reservationId ?? "미연결"}</p>
                  {participant.phone ? <p>전화번호: {maskPhoneNumber(participant.phone)}</p> : null}
                  <p>상태: {blocked ? "운영 제한" : "활성"}</p>
                  {blacklistEntry ? <p>제한 사유: {blacklistEntry.reason}</p> : null}
                </div>
                <Badge tone={blocked ? "warning" : "success"}>
                  {blocked ? "운영 제한" : "활성"}
                </Badge>
              </div>

              <div className="button-row wrap-row">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant="secondary"
                    disabled={blocked}
                    onClick={() => void onGrantHearts(participant.id, amount)}
                  >
                    +{amount}
                  </Button>
                ))}
                <Button
                  variant={blocked ? "secondary" : "danger"}
                  onClick={async () => {
                    if (blocked) {
                      await onSetBlacklistStatus(participant.id, false);
                      return;
                    }

                    const reason =
                      window.prompt("차단 사유를 입력해 주세요.", "운영 정책상 제한")?.trim() ?? "";
                    if (!reason) {
                      return;
                    }

                    await onSetBlacklistStatus(participant.id, true, reason);
                  }}
                >
                  {blocked ? "차단 해제" : "차단"}
                </Button>
              </div>

              <div className="compact-row">
                <input
                  type="number"
                  min={1}
                  disabled={blocked}
                  value={customAmounts[participant.id] ?? ""}
                  onChange={(event) =>
                    setCustomAmounts((current) => ({
                      ...current,
                      [participant.id]: event.target.value
                    }))
                  }
                  placeholder="직접 입력"
                />
                <Button
                  disabled={blocked}
                  onClick={async () => {
                    const amount = Number(customAmounts[participant.id] ?? "0");
                    if (!Number.isFinite(amount) || amount <= 0) {
                      return;
                    }

                    const ok = await onGrantHearts(participant.id, amount);
                    if (ok) {
                      setCustomAmounts((current) => ({
                        ...current,
                        [participant.id]: ""
                      }));
                    }
                  }}
                >
                  지급
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
