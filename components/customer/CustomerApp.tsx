"use client";

import { useMemo, useState } from "react";
import { ProfileFormFields } from "@/components/customer/ProfileFormFields";
import { PushNotificationCard } from "@/components/customer/PushNotificationCard";
import { RevealProgressCard } from "@/components/customer/RevealProgressCard";
import { RotationInstructionModal } from "@/components/customer/RotationInstructionModal";
import { TableStageCard } from "@/components/customer/TableStageCard";
import { UserPhoto } from "@/components/shared/Avatar";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import {
  buildMutualMatches,
  buildStageContent,
  getEncounterParticipants,
  getRotationInstructionForParticipant,
  isRotationInstructionActive
} from "@/engine/content";
import { buildRevealState } from "@/engine/reveal";
import { createCheckinCopy } from "@/features/checkin/model";
import { cn, formatTableName, REPORT_REASONS } from "@/lib/mingle";
import { selectCurrentParticipant, useMingleStore } from "@/stores/useMingleStore";
import type { CustomerTab, ParticipantRecord } from "@/types/mingle";

const TAB_LABELS: Record<CustomerTab, string> = {
  table: "테이블",
  hearts: "하트",
  settings: "설정"
};

function LoadingView() {
  return (
    <main className="customer-shell" data-phase="CHECKIN">
      <div className="customer-stage">
        <Surface className="skeleton-block" />
        <Surface className="skeleton-block" />
      </div>
    </main>
  );
}

function OnboardingView() {
  const snapshot = useMingleStore((state) => state.snapshot);
  const checkinDraft = useMingleStore((state) => state.checkinDraft);
  const profileDraft = useMingleStore((state) => state.profileDraft);
  const updateCheckinValue = useMingleStore((state) => state.updateCheckinValue);
  const verifyCheckin = useMingleStore((state) => state.verifyCheckin);
  const updateProfileDraft = useMingleStore((state) => state.updateProfileDraft);
  const completeProfile = useMingleStore((state) => state.completeProfile);

  if (!snapshot) {
    return <LoadingView />;
  }

  const copy = createCheckinCopy();
  const reservationLabel =
    checkinDraft.resolution?.reservationLabel ?? checkinDraft.resolution?.reservationId ?? null;

  return (
    <main className="customer-shell" data-phase="CHECKIN">
      <div className="customer-stage onboarding-stage">
        <Surface className="customer-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">CHECK-IN</p>
            <h1 className="hero-title">입장 확인을 먼저 완료한 뒤 현장 프로필을 시작합니다.</h1>
            <p className="hero-description">
              체크인은 예약과 기존 참가자 연결 기준으로 확인됩니다. 닉네임은 입장 권한이 아니라
              프로필 표시 정보입니다.
            </p>
          </div>
        </Surface>

        <div className="customer-grid">
          <div className="customer-main-column">
            <Surface>
              <SectionHeader eyebrow="CHECK-IN" title={copy.title} description={copy.description} />

              <label className="field">
                <span>체크인 QR</span>
                <input
                  value={checkinDraft.value}
                  onChange={(event) => updateCheckinValue(event.target.value)}
                  placeholder={copy.placeholder}
                  data-testid="checkin-input"
                  disabled={checkinDraft.isSubmitting}
                />
              </label>

              {reservationLabel ? (
                <div className="compact-row">
                  <strong>{reservationLabel}</strong>
                  <span>{checkinDraft.resolution?.reservationId}</span>
                </div>
              ) : null}

              {checkinDraft.flowState === "LOADING" ? (
                <Surface className="empty-state">
                  <h3>체크인 확인 중입니다</h3>
                  <p>중복 요청을 막기 위해 잠시만 기다려 주세요.</p>
                </Surface>
              ) : null}

              {checkinDraft.flowState === "SUCCESS" ? (
                <Surface className="empty-state">
                  <h3>입장 확인 완료</h3>
                  <p>{checkinDraft.customerSecondaryMessage ?? "다음 단계로 진행해 주세요."}</p>
                </Surface>
              ) : null}

              {checkinDraft.flowState === "BLOCKED" ? (
                <Surface className="empty-state">
                  <h3>{checkinDraft.customerMessage ?? "입장 확인을 진행할 수 없습니다"}</h3>
                  <p>
                    {checkinDraft.customerSecondaryMessage ??
                      "예약 정보나 세션 상태를 다시 확인해 주세요."}
                  </p>
                </Surface>
              ) : null}

              {checkinDraft.flowState === "FAILURE" ? (
                <Surface className="empty-state">
                  <h3>{checkinDraft.customerMessage ?? "입장 확인 중 문제가 발생했습니다"}</h3>
                  <p>{checkinDraft.customerSecondaryMessage ?? "잠시 후 다시 시도해 주세요."}</p>
                </Surface>
              ) : null}

              {checkinDraft.error &&
              (checkinDraft.flowState === "FAILURE" ||
                checkinDraft.flowState === "BLOCKED" ||
                checkinDraft.flowState === "IDLE") ? (
                <p className="field-error">{checkinDraft.error}</p>
              ) : null}

              <Button
                block
                onClick={() => void verifyCheckin()}
                data-testid="checkin-verify"
                disabled={checkinDraft.isSubmitting}
              >
                {checkinDraft.isSubmitting ? "확인 중..." : "체크인 확인"}
              </Button>
            </Surface>
          </div>

          <div className="customer-side-column">
            <Surface>
              <SectionHeader
                eyebrow="PROFILE"
                title="입장 확인 후 프로필을 입력합니다"
                description="닉네임은 프로필 정보로 저장되며, 중복되면 다른 닉네임을 입력해야 합니다."
              />
              <ProfileFormFields
                value={profileDraft}
                testIdPrefix="profile"
                onChange={updateProfileDraft}
              />
              <Button
                block
                onClick={() => void completeProfile()}
                data-testid="complete-profile"
                disabled={checkinDraft.flowState !== "SUCCESS"}
              >
                프로필 완료 후 입장
              </Button>
            </Surface>
          </div>
        </div>
      </div>
    </main>
  );
}

function MatchEndView({ participant }: { participant: ParticipantRecord }) {
  const snapshot = useMingleStore((state) => state.snapshot)!;
  const matches = useMemo(() => buildMutualMatches(snapshot, participant.id), [participant.id, snapshot]);

  return (
    <main className="customer-shell" data-phase="MATCH_END">
      <div className="customer-stage">
        <Surface className="customer-hero match-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">MATCH END</p>
            <h1 className="hero-title">최종 연결 결과가 열렸습니다.</h1>
            <p className="hero-description">
              서로 하트를 보낸 참가자만 마지막 단계에서 확인할 수 있습니다.
            </p>
          </div>
        </Surface>

        <div className="customer-grid">
          <div className="customer-main-column">
            <Surface>
              <SectionHeader
                eyebrow="RESULT"
                title={matches.length ? `${matches.length}개의 상호 연결` : "이번 라운드의 연결 결과"}
                description="최종 공개가 끝난 뒤 서로 연결된 참가자만 이 화면에 표시됩니다."
              />
              {matches.length ? (
                <div className="participant-grid">
                  {matches.map((match) => (
                    <article key={match.id} className="participant-card match-card">
                      <div className="participant-head">
                        <UserPhoto photoUrl={match.photoUrl} gender={match.gender} size={56} />
                        <div className="participant-copy">
                          <strong>{match.nickname}</strong>
                          <p>
                            {match.job} · {match.animalType}
                          </p>
                        </div>
                      </div>
                      <Button block>다시 이야기 나누기</Button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="공개된 상호 연결이 없습니다."
                  description="이번 세션에서는 상호 선택이 아직 성사되지 않았습니다."
                />
              )}
            </Surface>
          </div>
        </div>
      </div>
    </main>
  );
}

function CustomerView({ participant }: { participant: ParticipantRecord }) {
  const snapshot = useMingleStore((state) => state.snapshot)!;
  const customerTab = useMingleStore((state) => state.customerTab);
  const setCustomerTab = useMingleStore((state) => state.setCustomerTab);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);
  const sendHeart = useMingleStore((state) => state.sendHeart);
  const submitReport = useMingleStore((state) => state.submitReport);
  const updateParticipantProfile = useMingleStore((state) => state.updateParticipantProfile);
  const updateRound2Attendance = useMingleStore((state) => state.updateRound2Attendance);
  const acknowledgeRotation = useMingleStore((state) => state.acknowledgeRotation);
  const respondToContent = useMingleStore((state) => state.respondToContent);

  const [stagedRevealOpen, setStagedRevealOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState("");
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0] ?? "");
  const [reportDetails, setReportDetails] = useState("");
  const [profileEdit, setProfileEdit] = useState({
    nickname: participant.nickname,
    age: String(participant.age),
    jobCategory: participant.jobCategory,
    job: participant.job,
    photoUrl: participant.photoUrl ?? "",
    heightCm: String(participant.heightCm),
    animalType: participant.animalType,
    energyType: participant.energyType
  });

  const currentTableMembers = useMemo(
    () => snapshot.participants.filter((candidate) => candidate.tableId === participant.tableId),
    [participant.tableId, snapshot.participants]
  );
  const encounterParticipants = useMemo(
    () => getEncounterParticipants(snapshot, participant),
    [participant, snapshot]
  );
  const stageContent = useMemo(() => buildStageContent(snapshot, participant), [participant, snapshot]);
  const heartInbox = useMemo(
    () => buildRevealState(snapshot.session, participant, snapshot.hearts, snapshot.participants),
    [participant, snapshot]
  );
  const reportTargets = useMemo(
    () => encounterParticipants.filter((candidate) => candidate.id !== participant.id),
    [encounterParticipants, participant.id]
  );
  const latestAnnouncement = useMemo(() => snapshot.announcements[0] ?? null, [snapshot.announcements]);
  const rotationInstruction = getRotationInstructionForParticipant(snapshot, participant.id);
  const showRotationModal = isRotationInstructionActive(rotationInstruction);

  const saveProfile = async () => {
    await updateParticipantProfile({
      nickname: profileEdit.nickname,
      age: Number(profileEdit.age),
      jobCategory: profileEdit.jobCategory,
      job: profileEdit.job,
      heightCm: Number(profileEdit.heightCm),
      animalType: profileEdit.animalType,
      energyType: profileEdit.energyType,
      photoUrl: profileEdit.photoUrl || null
    });
  };

  return (
    <main className="customer-shell" data-phase={snapshot.session.phase}>
      <div className="customer-stage">
        <Surface className="customer-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">TABLE FIRST</p>
            <h1 className="hero-title">
              {participant.nickname}님, 지금은 {formatTableName(participant.tableId)} 라운드입니다.
            </h1>
            <p className="hero-description">
              테이블 중심으로 진행하고, 운영 지시와 연결 신호는 이 화면에서 바로 이어집니다.
            </p>
          </div>
          <div className="hero-signal-grid">
            <div className="hero-signal-card">
              <span className="hero-side-kicker">현재 단계</span>
              <strong>{snapshot.session.phase}</strong>
              <p>운영 단계가 바뀌면 이 화면도 바로 갱신됩니다.</p>
            </div>
            <div className="hero-signal-card">
              <span className="hero-side-kicker">현재 테이블</span>
              <strong data-testid="current-table-label">{formatTableName(participant.tableId)}</strong>
              <p>{currentTableMembers.length}명이 같은 테이블에서 대화를 이어가고 있습니다.</p>
            </div>
            <div className="hero-signal-card">
              <span className="hero-side-kicker">남은 하트</span>
              <strong>{participant.heartsRemaining}개</strong>
              <p>추가 하트는 현장에서 운영자를 통해 지급됩니다.</p>
            </div>
          </div>
        </Surface>

        <Surface>
          <div className="segmented">
            {(Object.keys(TAB_LABELS) as CustomerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn("segmented-item", customerTab === tab && "segmented-item-active")}
                onClick={() => setCustomerTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </Surface>

        {customerTab === "table" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <TableStageCard
                participant={participant}
                liveContent={stageContent.liveContent}
                inboxMessages={stageContent.inboxMessages}
                responseCount={stageContent.responseCount}
                alreadyResponded={stageContent.alreadyResponded}
                encounterParticipants={encounterParticipants}
                onRespond={respondToContent}
              />

              <Surface>
                <SectionHeader
                  eyebrow="CURRENT TABLE"
                  title={`${formatTableName(participant.tableId)} 참가자`}
                  description="지금 같은 테이블에 있는 참가자를 바로 확인할 수 있습니다."
                />
                <div className="participant-grid">
                  {currentTableMembers.map((member) => (
                    <article key={member.id} className="participant-card">
                      <div className="participant-head">
                        <UserPhoto photoUrl={member.photoUrl} gender={member.gender} size={52} />
                        <div className="participant-copy">
                          <strong>{member.nickname}</strong>
                          <p>
                            {member.job} · {member.energyType}
                          </p>
                        </div>
                      </div>
                      <div className="badge-row">
                        <Badge tone="neutral">{member.animalType}</Badge>
                        {member.id === participant.id ? <Badge tone="accent">ME</Badge> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="RECENT ENCOUNTERS"
                  title="최근 만난 참가자"
                  description="이전 테이블이나 최근 라운드에서 만난 참가자만 다시 보여줍니다."
                />
                {encounterParticipants.length ? (
                  <div className="participant-grid">
                    {encounterParticipants.map((candidate) => (
                      <article key={candidate.id} className="participant-card">
                        <div className="participant-head">
                          <UserPhoto photoUrl={candidate.photoUrl} gender={candidate.gender} size={52} />
                          <div className="participant-copy">
                            <strong>{candidate.nickname}</strong>
                            <p>
                              {candidate.job} · {candidate.energyType}
                            </p>
                          </div>
                        </div>
                        <div className="badge-row">
                          <Badge tone="neutral">{candidate.animalType}</Badge>
                          <Button onClick={() => void sendHeart(candidate.id)}>하트 보내기</Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="아직 최근 만난 참가자가 없습니다."
                    description="라운드가 진행되면 이 영역에 최근 만난 참가자가 표시됩니다."
                  />
                )}
              </Surface>
            </div>

            <div className="customer-side-column">
              <RevealProgressCard heartsRemaining={participant.heartsRemaining} />
              {latestAnnouncement ? (
                <Surface>
                  <SectionHeader
                    eyebrow="ANNOUNCEMENT"
                    title="운영 안내"
                    description={latestAnnouncement.message}
                  />
                </Surface>
              ) : null}
            </div>
          </div>
        ) : null}

        {customerTab === "hearts" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <RevealProgressCard heartsRemaining={participant.heartsRemaining} />

              <Surface>
                <SectionHeader
                  eyebrow="INBOX"
                  title={`받은 하트 ${heartInbox.receivedCount}개`}
                  description={heartInbox.status}
                />
              </Surface>

              {heartInbox.canReveal && !stagedRevealOpen ? (
                <Surface>
                  <SectionHeader
                    eyebrow="REVEAL"
                    title="공개를 열 준비가 되었습니다"
                    description={heartInbox.status}
                    actions={<Button onClick={() => setStagedRevealOpen(true)}>보낸 사람 보기</Button>}
                  />
                </Surface>
              ) : null}

              {heartInbox.canReveal ? (
                stagedRevealOpen ? (
                  <Surface>
                    <SectionHeader
                      eyebrow="REVEALED"
                      title="보낸 사람이 공개되었습니다"
                      description={heartInbox.status}
                    />
                    <div className="participant-grid">
                      {heartInbox.visibleSenders.map((sender) => (
                        <article key={sender.id} className="participant-card">
                          <div className="participant-head">
                            <UserPhoto photoUrl={sender.photoUrl} gender={sender.gender} size={52} />
                            <div className="participant-copy">
                              <strong>{sender.nickname}</strong>
                              <p>
                                {sender.job} · {sender.animalType}
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => void sendHeart(sender.id)}>하트 보내기</Button>
                        </article>
                      ))}
                    </div>
                  </Surface>
                ) : null
              ) : (
                <Surface>
                  <SectionHeader
                    eyebrow="LOCKED"
                    title="아직 공개 단계가 아닙니다"
                    description={heartInbox.status}
                  />
                </Surface>
              )}
            </div>
          </div>
        ) : null}

        {customerTab === "settings" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="PROFILE"
                  title="내 프로필 수정"
                  description="운영 중에도 기본 프로필 정보를 정리할 수 있습니다."
                />
                <ProfileFormFields
                  value={profileEdit}
                  testIdPrefix="settings"
                  onChange={(field, value) =>
                    setProfileEdit((current) => ({ ...current, [field]: value }))
                  }
                />
                <Button block onClick={() => void saveProfile()}>
                  프로필 저장
                </Button>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="ROUND 2"
                  title="2차 참석 여부"
                  description="운영자는 이 응답을 기준으로 다음 라운드 참여를 확인합니다."
                />
                <div className="segmented">
                  {(["YES", "NO"] as const).map((attendance) => (
                    <button
                      key={attendance}
                      type="button"
                      className={cn(
                        "segmented-item",
                        participant.round2Attendance === attendance && "segmented-item-active"
                      )}
                      onClick={() => void updateRound2Attendance(attendance)}
                    >
                      {attendance === "YES" ? "참석" : "불참"}
                    </button>
                  ))}
                </div>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="SAFETY"
                  title="운영 신고"
                  description="현장에서 불편하거나 위험한 상황이 있으면 바로 신고할 수 있습니다."
                />
                <div className="form-grid">
                  <label className="field">
                    <span>대상 참가자</span>
                    <select
                      value={reportTarget}
                      onChange={(event) => setReportTarget(event.target.value)}
                      data-testid="report-target"
                    >
                      <option value="">선택</option>
                      {reportTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.nickname}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>사유</span>
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      data-testid="report-reason"
                    >
                      {REPORT_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field field-span-2">
                    <span>상세 내용</span>
                    <textarea
                      rows={4}
                      value={reportDetails}
                      onChange={(event) => setReportDetails(event.target.value)}
                      data-testid="report-details"
                    />
                  </label>
                </div>
                <Button
                  block
                  data-testid="submit-report"
                  disabled={!reportTarget || reportDetails.trim().length < 8}
                  onClick={async () => {
                    const ok = await submitReport(reportTarget, reportReason, reportDetails);
                    if (ok) {
                      setReportTarget("");
                      setReportDetails("");
                    }
                  }}
                >
                  신고 제출
                </Button>
              </Surface>
            </div>

            <div className="customer-side-column">
              <PushNotificationCard />
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="toast" onClick={() => dismissToast()}>
            <strong>{toast.tone.toUpperCase()}</strong>
            <span>{toast.message}</span>
          </div>
        ) : null}

        {showRotationModal && rotationInstruction && snapshot.rotationInstruction ? (
          <RotationInstructionModal
            instruction={rotationInstruction}
            deadlineAt={snapshot.rotationInstruction.deadlineAt}
            onConfirm={acknowledgeRotation}
          />
        ) : null}
      </div>
    </main>
  );
}

export function CustomerApp() {
  const hydrated = useMingleStore((state) => state.hydrated);
  const participant = useMingleStore(selectCurrentParticipant);
  const snapshot = useMingleStore((state) => state.snapshot);

  if (!hydrated || !snapshot) {
    return <LoadingView />;
  }

  if (!participant) {
    return <OnboardingView />;
  }

  if (snapshot.session.phase === "MATCH_END") {
    return <MatchEndView participant={participant} />;
  }

  return <CustomerView participant={participant} />;
}
