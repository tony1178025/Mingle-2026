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

    void generateQrDataUrl(`mingle://session/${sessionId}`).then((nextUrl) => {
      if (alive) {
        setQrDataUrl(nextUrl);
      }
    });

    return () => {
      alive = false;
    };
  }, [sessionId]);

  return (
    <Surface className="qr-card">
      <div className="qr-card-head">
        <div>
          <p className="eyebrow">CHECK-IN QR</p>
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
        QR, 4자리 코드, 스태프 확인까지 세 가지 체크인 경로를 모두 지원합니다.
      </p>
    </Surface>
  );
}
