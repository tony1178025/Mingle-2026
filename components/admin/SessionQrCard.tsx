"use client";

import { useEffect, useState } from "react";
import { Badge, Surface } from "@/components/shared/ui";
import { generateQrDataUrl } from "@/lib/qr/generate";

export function SessionQrCard({
  sessionId,
  sessionCode
}: {
  sessionId: string;
  sessionCode: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let alive = true;
    const qrPayload = `mingle://session/${sessionId}?code=${sessionCode}`;

    void generateQrDataUrl(qrPayload).then((nextUrl) => {
      if (alive) {
        setQrDataUrl(nextUrl);
      }
    });

    return () => {
      alive = false;
    };
  }, [sessionCode, sessionId]);

  return (
    <Surface className="qr-card">
      <div className="qr-card-head">
        <div>
          <p className="eyebrow">체크인 QR</p>
          <h3 className="inner-title">현장 체크인</h3>
        </div>
        <Badge tone="accent">{sessionCode}</Badge>
      </div>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="세션 체크인 QR" className="qr-image" />
      ) : (
        <div className="qr-skeleton" />
      )}
      <p className="inner-description">
        체크인 QR은 단일 규격만 사용합니다. 세션 QR을 스캔하면 동일한 계약으로 고객 체크인 입력에 바로 붙여 넣을 수 있습니다.
      </p>
    </Surface>
  );
}
