"use client";

import { useMemo, useState } from "react";
import { Badge, Button, SectionHeader, Surface } from "@/components/shared/ui";
import type { AnonymousMessageRecord, LiveContentRecord, ParticipantRecord } from "@/types/mingle";

function toneForContent(kind: LiveContentRecord["kind"]) {
  if (kind === "announcement") return "warning";
  if (kind === "nudge") return "accent";
  return "success";
}

export function TableStageCard({
  participant,
  liveContent,
  inboxMessages,
  responseCount,
  alreadyResponded,
  onRespond,
  encounterParticipants
}: {
  participant: ParticipantRecord;
  liveContent: LiveContentRecord | null;
  inboxMessages: AnonymousMessageRecord[];
  responseCount: number;
  alreadyResponded: boolean;
  encounterParticipants: ParticipantRecord[];
  onRespond: (value: string, recipientId?: string | null) => Promise<boolean>;
}) {
  const [textValue, setTextValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

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
        {inboxMessages.length ? (
          <div className="compact-stack">
            {inboxMessages.map((message) => (
              <div key={message.id} className="compact-row">
                <strong>익명 메시지</strong>
                <span>{message.message}</span>
              </div>
            ))}
          </div>
        ) : null}
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
    (liveContent.kind === "anonymous" && (!textValue.trim() || !selectedRecipientId));

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
          <label className="field">
            <span>보낼 대상</span>
            <select value={selectedRecipientId} onChange={(event) => setSelectedRecipientId(event.target.value)}>
              <option value="">선택</option>
              {encounterParticipants.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.nickname}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>익명 메시지</span>
            <textarea
              rows={3}
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              maxLength={80}
              placeholder="짧고 명확하게 적어주세요."
            />
          </label>
        </div>
      ) : null}

      {inboxMessages.length ? (
        <div className="compact-stack">
          {inboxMessages.slice(0, 2).map((message) => (
            <div key={message.id} className="compact-row">
              <strong>받은 익명 메시지</strong>
              <span>{message.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        block
        disabled={submitDisabled}
        onClick={() => void onRespond(submitValue, selectedRecipientId || null)}
      >
        {alreadyResponded ? "이미 응답 완료" : liveContent.ctaLabel}
      </Button>
    </Surface>
  );
}
