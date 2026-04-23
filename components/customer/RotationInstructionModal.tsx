"use client";

import { useEffect, useState } from "react";
import { Badge, Button } from "@/components/shared/ui";
import { formatTableName } from "@/lib/mingle";
import type { RotationParticipantInstruction } from "@/types/mingle";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RotationInstructionModal({
  instruction,
  deadlineAt,
  onConfirm
}: {
  instruction: RotationParticipantInstruction;
  deadlineAt: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, new Date(deadlineAt).getTime() - Date.now())
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, new Date(deadlineAt).getTime() - Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadlineAt]);

  return (
    <div className="rotation-modal">
      <div className="rotation-modal-card">
        <p className="eyebrow">MOVE NOW</p>
        <h2 className="rotation-modal-title">{formatTableName(instruction.toTableId)}로 이동하세요</h2>
        <p className="rotation-modal-copy">
          {formatTableName(instruction.fromTableId)}에서 다음 라운드가 종료되었습니다. 지금 바로{" "}
          {formatTableName(instruction.toTableId)}로 이동한 뒤 완료 버튼을 눌러주세요.
        </p>
        <div className="rotation-timer">{formatRemaining(remainingMs)}</div>
        {instruction.reasonTags.length ? (
          <div className="badge-row">
            {instruction.reasonTags.map((tag) => (
              <Badge key={tag} tone="accent">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <Button block onClick={() => void onConfirm()}>
          이동 완료
        </Button>
      </div>
    </div>
  );
}
