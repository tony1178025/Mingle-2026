"use client";

import { useEffect, useState } from "react";
import { Badge, Surface } from "@/components/shared/ui";
import { parseFetchResponseJson } from "@/lib/api/parse-fetch-response";
import { generateQrDataUrl } from "@/lib/qr/generate";

export function SessionQrCard({
  branchId,
  tableCount,
  sessionId
}: {
  branchId: string;
  tableCount: number;
  sessionId: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(1);
  const [checkinCode, setCheckinCode] = useState("");
  const tableId = Math.min(Math.max(1, selectedTableId), Math.max(1, tableCount));
  const webCheckinUrl =
    typeof window === "undefined"
      ? `/customer?branchId=${branchId}&tableId=${tableId}${checkinCode ? `&code=${checkinCode}` : ""}`
      : `${window.location.origin}/customer?branchId=${branchId}&tableId=${tableId}${
          checkinCode ? `&code=${checkinCode}` : ""
        }`;
  const nativeContractValue = `mingle://table/${branchId}/${tableId}`;

  useEffect(() => {
    let alive = true;
    void generateQrDataUrl(webCheckinUrl).then((nextUrl) => {
      if (alive) {
        setQrDataUrl(nextUrl);
      }
    });

    return () => {
      alive = false;
    };
  }, [webCheckinUrl]);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/session/current", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await parseFetchResponseJson<{
          data: { tableQrCodes?: Array<{ tableId: number; status: string; code: string }> };
          currentParticipantId: string | null;
        }>(response);
        return payload.data?.tableQrCodes ?? [];
      })
      .then((codes) => {
        if (!mounted || !codes) return;
        const active = codes.find((item) => item.tableId === tableId && item.status === "ACTIVE");
        setCheckinCode(active?.code ?? "");
      })
      .catch(() => {
        if (!mounted) return;
        setCheckinCode("");
      });
    return () => {
      mounted = false;
    };
  }, [tableId]);

  return (
    <Surface className="qr-card">
      <div className="qr-card-head">
        <div>
          <p className="eyebrow">체크인 QR</p>
          <h3 className="inner-title">테이블 체크인</h3>
        </div>
        <Badge tone="accent">T{tableId}</Badge>
      </div>
      <label className="field">
        <span>테이블 선택</span>
        <select
          value={tableId}
          onChange={(event) => {
            setSelectedTableId(Number(event.target.value));
          }}
        >
          {Array.from({ length: Math.max(1, tableCount) }, (_, index) => index + 1).map((item) => (
            <option key={item} value={item}>
              테이블 {item}
            </option>
          ))}
        </select>
      </label>
      <div className="qr-card-actions">
        <button
          type="button"
          className="admin-mini-button"
          onClick={async () => {
            const confirmed = window.confirm("선택한 테이블의 체크인 QR을 새로 발급할까요? 이전 QR은 바로 사용할 수 없게 됩니다.");
            if (!confirmed) return;
            try {
              const response = await fetch(
                `/api/admin/sessions/${sessionId}/tables/${tableId}/qr/regenerate`,
                { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" } }
              );
              const payload = await parseFetchResponseJson<{
                status: string;
                snapshot: { tableQrCodes?: Array<{ tableId: number; status: string; code: string }> };
              }>(response);
              const active = (payload.snapshot?.tableQrCodes ?? []).find(
                (item) => item.tableId === tableId && item.status === "ACTIVE"
              );
              setCheckinCode(active?.code ?? "");
            } catch {
              setCheckinCode("");
            }
          }}
        >
          QR 재생성
        </button>
        <button
          type="button"
          className="admin-mini-button admin-mini-button-danger"
          onClick={async () => {
            const confirmed = window.confirm(
              "이 테이블의 활성 QR을 폐기할까요? 고객은 새 QR이 나올 때까지 체크인할 수 없습니다."
            );
            if (!confirmed) return;
            try {
              const response = await fetch(
                `/api/admin/sessions/${sessionId}/tables/${tableId}/qr/revoke`,
                { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" } }
              );
              await parseFetchResponseJson<{ status: string }>(response);
              setCheckinCode("");
            } catch {
              /* UI는 현재 코드 유지; 운영자가 새로고침으로 재확인 */
            }
          }}
        >
          QR 폐기
        </button>
      </div>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="테이블 체크인 QR" className="qr-image" />
      ) : (
        <div className="qr-skeleton" />
      )}
      <p className="inner-description">
        모바일에서 바로 열리도록 웹 주소 QR을 씁니다. 앱 계약 스킴은 {nativeContractValue} 이고, 지금 QR은{" "}
        {webCheckinUrl} 로 연결됩니다. 재생성 시 이전 코드는 즉시 막히며, 폐기 시에는 새 QR을 발급해야
        체크인됩니다.
      </p>
    </Surface>
  );
}
