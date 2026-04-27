"use client";

import { useEffect, useState } from "react";
import { Badge, Surface } from "@/components/shared/ui";
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
        const payload = (await response.json()) as {
          data?: { tableQrCodes?: Array<{ tableId: number; status: string; code: string }> };
        };
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
      <button
        type="button"
        className="admin-mini-button"
        onClick={async () => {
          const confirmed = window.confirm("선택한 테이블 QR을 재생성할까요?");
          if (!confirmed) return;
          const response = await fetch(
            `/api/admin/sessions/${sessionId}/tables/${tableId}/qr/regenerate`,
            { method: "POST", headers: { "Content-Type": "application/json" } }
          );
          if (!response.ok) return;
          const payload = (await response.json()) as {
            snapshot?: { tableQrCodes?: Array<{ tableId: number; status: string; code: string }> };
          };
          const active = (payload.snapshot?.tableQrCodes ?? []).find(
            (item) => item.tableId === tableId && item.status === "ACTIVE"
          );
          setCheckinCode(active?.code ?? "");
        }}
      >
        QR 재생성
      </button>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="테이블 체크인 QR" className="qr-image" />
      ) : (
        <div className="qr-skeleton" />
      )}
      <p className="inner-description">
        모바일 브라우저/PWA에서 바로 열리도록 웹 주소 QR을 사용합니다. 계약 값은 {nativeContractValue} 이며,
        현재 QR은 {webCheckinUrl} 로 연결됩니다.
      </p>
    </Surface>
  );
}
