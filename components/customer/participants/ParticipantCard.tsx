"use client";

import { UserPhoto } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/ui";
import { formatTableName } from "@/lib/mingle";
import type { ParticipantRecord } from "@/types/mingle";

export function ParticipantCard({
  phase,
  participant,
  canSendHeart,
  onOpen,
  onSendHeart
}: {
  phase: string;
  participant: ParticipantRecord;
  canSendHeart: boolean;
  onOpen: () => void;
  onSendHeart: () => void;
}) {
  return (
    <article className={phase === "ROUND_2" ? "mg-participant-card round2" : "mg-participant-card round1"}>
      <button type="button" className="participant-head" onClick={onOpen}>
        <UserPhoto photoUrl={participant.photoUrl} gender={participant.gender} size={48} />
        <div className="participant-copy">
          <strong>{participant.nickname}</strong>
          {phase === "ROUND_2" ? (
            <p>
              {participant.age} · {participant.job}
            </p>
          ) : (
            <p>{formatTableName(participant.tableId)}</p>
          )}
        </div>
      </button>
      <Button className="heart-send-button" disabled={!canSendHeart} onClick={onSendHeart}>
        ♡
      </Button>
    </article>
  );
}
