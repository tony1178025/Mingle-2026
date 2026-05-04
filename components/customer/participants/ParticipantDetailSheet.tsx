"use client";

import { UserPhoto } from "@/components/shared/Avatar";
import { Button, Surface } from "@/components/shared/ui";
import type { CustomerParticipantView, ParticipantRecord } from "@/types/mingle";

export function ParticipantDetailSheet({
  open,
  phase,
  participant,
  onClose,
  onSendHeart
}: {
  open: boolean;
  phase: string;
  participant: ParticipantRecord | CustomerParticipantView | null;
  onClose: () => void;
  onSendHeart: (participantId: string) => void;
}) {
  if (!open || !participant) return null;
  return (
    <div
      className="rotation-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <Surface
        as="div"
        className="rotation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="participant-head">
          <UserPhoto
            photoUrl={participant.profileImage ?? null}
            gender={participant.gender ?? "M"}
            size={72}
          />
          <div className="participant-copy">
            <strong id="participant-sheet-title">{participant.nickname}</strong>
            {phase === "ROUND_2" ? (
              <p>
                {participant.age ?? "-"} · {participant.job ?? "-"}
              </p>
            ) : null}
          </div>
        </div>
        {phase === "ROUND_2" ? (
          <div className="badge-row">
            <span className="badge badge-neutral">{participant.animalType ?? "-"}</span>
            <span className="badge badge-neutral">{participant.energyType ?? "-"}</span>
          </div>
        ) : null}
        <Button block onClick={() => onSendHeart(participant.id)}>
          하트 보내기
        </Button>
        <Button block variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </Surface>
    </div>
  );
}
