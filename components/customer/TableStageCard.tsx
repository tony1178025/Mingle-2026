"use client";

import { useMemo, useState } from "react";
import { Badge, Button, SectionHeader, Surface } from "@/components/shared/ui";
import type { LiveContentRecord, ParticipantRecord } from "@/types/mingle";

function toneForContent(kind: LiveContentRecord["kind"]) {
  if (kind === "announcement") return "warning";
  if (kind === "nudge") return "accent";
  return "success";
}

export function TableStageCard({
  participant,
  liveContent,
  responseCount,
  alreadyResponded,
  anonymousMessageCount,
  tablePickWindowOpen,
  tablePickRotationIndex,
  tablePickCandidates,
  tablePickExisting,
  onRespond,
  encounterParticipants
}: {
  participant: ParticipantRecord;
  liveContent: LiveContentRecord | null;
  responseCount: number;
  alreadyResponded: boolean;
  anonymousMessageCount: number;
  tablePickWindowOpen: boolean;
  tablePickRotationIndex: 0 | 1 | null;
  tablePickCandidates: ParticipantRecord[];
  tablePickExisting: { wantToKnowParticipantId: string | null; funnyParticipantId: string | null };
  encounterParticipants: ParticipantRecord[];
  onRespond: (value: string, recipientId?: string | null) => Promise<boolean>;
}) {
  const [textValue, setTextValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [receiverHint, setReceiverHint] = useState("");
  const [revealSender, setRevealSender] = useState(false);
  const [wantToKnowParticipantId, setWantToKnowParticipantId] = useState(
    tablePickExisting.wantToKnowParticipantId ?? ""
  );
  const [funnyParticipantId, setFunnyParticipantId] = useState(tablePickExisting.funnyParticipantId ?? "");

  const defaultResponse = useMemo(() => {
    if (!liveContent) return "";
    if (liveContent.kind === "prompt") return "질문 시작";
    if (liveContent.kind === "announcement") return "공지 확인";
    if (liveContent.kind === "nudge") return "지금 바로 참여";
    return "";
  }, [liveContent]);

  if (!liveContent) {
    return (
      <Surface className="table-stage-card">
        <SectionHeader
          eyebrow="테이블 진행"
          title={`${participant.nickname}님, 지금은 테이블 대화 시간입니다`}
          description=""
        />
      </Surface>
    );
  }

  const submitValue =
    liveContent.kind === "vote"
      ? selectedOption
      : liveContent.kind === "anonymous"
        ? textValue
        : defaultResponse;
  const submitDisabled =
    alreadyResponded ||
    (liveContent.kind === "vote" && !selectedOption) ||
    (liveContent.kind === "anonymous" && (!textValue.trim() || anonymousMessageCount >= 2)) ||
    (liveContent.kind === "table_impression_pick" &&
      (!tablePickWindowOpen ||
        !wantToKnowParticipantId ||
        !funnyParticipantId ||
        wantToKnowParticipantId === funnyParticipantId));

  return (
    <Surface className={`table-stage-card table-stage-${liveContent.kind}`}>
      <SectionHeader
        eyebrow="현장 미션"
        title={liveContent.title}
        description={liveContent.description}
        actions={
          <Badge tone={toneForContent(liveContent.kind)}>
            {liveContent.kind === "announcement"
              ? "공지"
              : liveContent.kind === "nudge"
                ? "유도"
                : liveContent.kind === "vote"
                  ? "투표"
                  : liveContent.kind === "anonymous"
                    ? "익명"
                    : liveContent.kind === "table_impression_pick"
                      ? "테이블 픽"
                    : "질문"}
          </Badge>
        }
      />
      <div className="compact-row">
        <strong>참여 수</strong>
        <span>{responseCount}명 응답</span>
      </div>

      {liveContent.kind === "vote" ? (
        <div className="choice-stack">
          {liveContent.options.map((option) => (
            <button
              key={option}
              type="button"
              className={selectedOption === option ? "choice-card choice-card-active" : "choice-card"}
              onClick={() => setSelectedOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {liveContent.kind === "anonymous" ? (
        <div className="compact-stack">
          <div className="compact-row">
            <strong>메시지 남기기</strong>
            <span>최대 2개</span>
          </div>
          <label className="field">
            <span>받는 사람</span>
            <select value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)}>
              <option value="">선택</option>
              {encounterParticipants
                .filter((candidate) => candidate.id !== participant.id && candidate.gender !== participant.gender)
                .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.nickname}
                </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>특징</span>
            <input
              value={receiverHint}
              onChange={(event) => setReceiverHint(event.target.value.slice(0, 40))}
              maxLength={40}
              placeholder="선택 입력"
            />
          </label>
          <label className="field">
            <span>메시지</span>
            <textarea
              rows={3}
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              maxLength={120}
              placeholder="최대 120자"
            />
          </label>
          <label className="compact-row">
            <strong>내 이름 공개</strong>
            <input
              type="checkbox"
              checked={revealSender}
              onChange={(event) => setRevealSender(event.target.checked)}
            />
          </label>
        </div>
      ) : null}
      {liveContent.kind === "table_impression_pick" ? (
        <div className="compact-stack">
          {!tablePickCandidates.length ? (
            <p className="field-help">선택 가능한 참가자가 없습니다</p>
          ) : (
            <>
              <label className="field">
                <span>더 알아가고 싶은 사람</span>
                <select
                  value={wantToKnowParticipantId}
                  onChange={(event) => setWantToKnowParticipantId(event.target.value)}
                >
                  <option value="">선택</option>
                  {tablePickCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.nickname}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>재미있는 사람</span>
                <select value={funnyParticipantId} onChange={(event) => setFunnyParticipantId(event.target.value)}>
                  <option value="">선택</option>
                  {tablePickCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.nickname}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {!tablePickWindowOpen ? <p className="field-help">마감되었습니다</p> : null}
        </div>
      ) : null}

      <Button
        block
        disabled={submitDisabled}
        onClick={async () => {
          let ok = false;
          if (liveContent.kind === "anonymous") {
            const response = await fetch("/api/customer/anonymous-messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: participant.sessionId,
                contentBlockId: liveContent.id,
                senderParticipantId: participant.id,
                receiverParticipantId: selectedRecipientId || null,
                receiverHint: receiverHint.trim() || null,
                message: textValue.trim(),
                revealSender
              })
            });
            ok = response.ok;
          } else if (liveContent.kind === "table_impression_pick") {
            if (tablePickRotationIndex === null) return;
            const response = await fetch("/api/customer/table-pick", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: participant.sessionId,
                participantId: participant.id,
                rotationIndex: tablePickRotationIndex,
                wantToKnowParticipantId,
                funnyParticipantId,
                contentBlockId: liveContent.id
              })
            });
            ok = response.ok;
          } else {
            ok = await onRespond(submitValue, selectedRecipientId || null);
          }
          if (ok) {
            setTextValue("");
            setSelectedRecipientId("");
            setReceiverHint("");
            setRevealSender(false);
          }
        }}
      >
        {liveContent.kind === "anonymous"
          ? anonymousMessageCount >= 2
            ? "2개 모두 작성 완료"
            : "보내기"
          : liveContent.kind === "table_impression_pick"
            ? "제출"
          : alreadyResponded
            ? "이미 응답 완료"
            : liveContent.ctaLabel}
      </Button>
    </Surface>
  );
}
