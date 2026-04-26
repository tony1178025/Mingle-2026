"use client";

import { useEffect, useState } from "react";
import { Badge, Surface } from "@/components/shared/ui";
import { generateQrDataUrl } from "@/lib/qr/generate";

export function SessionQrCard({
  branchId,
  tableCount
}: {
  branchId: string;
  tableCount: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(1);
  const tableId = Math.min(Math.max(1, selectedTableId), Math.max(1, tableCount));
  const webCheckinUrl =
    typeof window === "undefined"
      ? `/customer?branchId=${branchId}&tableId=${tableId}`
      : `${window.location.origin}/customer?branchId=${branchId}&tableId=${tableId}`;
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
