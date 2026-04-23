"use client";

import { useState } from "react";
import { Button, Surface } from "@/components/shared/ui";
import { registerPushToken } from "@/lib/firebase/messaging";
import { useMingleStore } from "@/stores/useMingleStore";

export function PushNotificationCard() {
  const snapshot = useMingleStore((state) => state.snapshot);
  const currentParticipantId = useMingleStore((state) => state.currentParticipantId);
  const [status, setStatus] = useState("알림 권한은 아직 요청하지 않았습니다.");
  const [busy, setBusy] = useState(false);

  return (
    <Surface className="inner-surface">
      <h3 className="inner-title">현장 알림</h3>
      <p className="inner-description">
        라운드 전환, 운영 공지, 하트 공개 시점을 브라우저 알림으로 받을 수 있습니다.
      </p>
      <p className="inner-description">{status}</p>
      <Button
        type="button"
        onClick={async () => {
          setBusy(true);

          try {
            const token = await registerPushToken({
              sessionId: snapshot?.session.id ?? null,
              participantId: currentParticipantId
            });
            setStatus(`알림 등록이 완료되었습니다. 토큰: ${token.slice(0, 12)}...`);
          } catch (error) {
            setStatus(error instanceof Error ? error.message : "알림 등록에 실패했습니다.");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
      >
        {busy ? "등록 중..." : "현장 알림 켜기"}
      </Button>
    </Surface>
  );
}
