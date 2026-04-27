
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProfileFormFields } from "@/components/customer/ProfileFormFields";
import { ParticipantCard } from "@/components/customer/participants/ParticipantCard";
import { ParticipantDetailSheet } from "@/components/customer/participants/ParticipantDetailSheet";
import { ParticipantFilterTabs } from "@/components/customer/participants/ParticipantFilterTabs";
import { ParticipantPagination } from "@/components/customer/participants/ParticipantPagination";
import { RevealProgressCard } from "@/components/customer/RevealProgressCard";
import { RotationInstructionModal } from "@/components/customer/RotationInstructionModal";
import { TableStageCard } from "@/components/customer/TableStageCard";
import { MgScrollTopButton } from "@/components/customer/ui/MgScrollTopButton";
import { UserPhoto } from "@/components/shared/Avatar";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import {
  buildMutualMatches,
  buildStageContent,
  getContactExchangeBetween,
  getEncounterParticipants,
  getRotationInstructionForParticipant,
  isRotationInstructionActive
} from "@/engine/content";
import { buildRevealState } from "@/engine/reveal";
import { cn, createToast, formatTableName, REPORT_REASONS } from "@/lib/mingle";
import { triggerHaptic } from "@/lib/haptics";
import { parseCheckinQrValue } from "@/features/checkin/model";
import { track } from "@/lib/analytics/track";
import type { ParticipantFilter } from "@/lib/customer-ui/filterParticipants";
import { filterParticipants } from "@/lib/customer-ui/filterParticipants";
import { paginate } from "@/lib/customer-ui/paginate";
import { useDesignQA } from "@/lib/ux/design-qa";
import { useScrollTopButton } from "@/hooks/useScrollTopButton";
import { selectCurrentParticipant, useMingleStore } from "@/stores/useMingleStore";
import type { ContactExchangeMethod, CustomerTab, ParticipantRecord } from "@/types/mingle";

const TAB_LABELS: Record<CustomerTab, string> = {
  all: "전체",
  table: "테이블",
  content: "콘텐츠",
  me: "내 정보"
};

const PHASE_LABELS: Record<string, string> = {
  CHECKIN: "체크인",
  ROUND_1: "1라운드",
  BREAK: "휴식",
  ROUND_2: "2라운드",
  MATCH_END: "매칭 결과",
  CLOSED: "종료"
};

function formatPhaseLabel(phase: string) {
  return PHASE_LABELS[phase] ?? phase;
}

function formatOperationalPhaseLabel(phase: string) {
  if (phase === "BREAK") return "이동·정리";
  if (phase === "ROUND_2") return "2라운드";
  if (phase === "CLOSED") return "종료";
  return "1라운드";
}

function formatContactExchangeStatus(status: "PENDING" | "COMPLETED" | "BLOCKED") {
  if (status === "COMPLETED") return "공유 완료";
  if (status === "BLOCKED") return "운영 제한";
  return "상대 동의 대기";
}

function getPhaseSingleMessage(phase: string, revealOpen: boolean) {
  if (revealOpen) return "서로 선택된 분과 대화를 이어가보세요";
  if (phase === "ROUND_2") return "대화를 이어가고 싶은 분을 선택해주세요";
  return "관심 있는 분께 가볍게 표시해보세요";
}

function LoadingView() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const skeletonTimer = window.setTimeout(() => setShowSkeleton(true), 120);
    const slowTimer = window.setTimeout(() => setShowSlowMessage(true), 400);
    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(slowTimer);
    };
  }, []);

  return (
    <main className="customer-shell" data-phase="CHECKIN">
      <div className="customer-stage">
        {showSkeleton ? (
          <>
            <Surface className="skeleton-block" />
            <Surface className="skeleton-block" />
          </>
        ) : null}
        {showSlowMessage ? (
          <Surface>
            <p className="field-help">불러오는 중...</p>
          </Surface>
        ) : null}
      </div>
    </main>
  );
}

function OnboardingView() {
  useDesignQA();
  const snapshot = useMingleStore((state) => state.snapshot);
  const checkinDraft = useMingleStore((state) => state.checkinDraft);
  const profileDraft = useMingleStore((state) => state.profileDraft);
  const verifyCheckin = useMingleStore((state) => state.verifyCheckin);
  const updateCheckinValue = useMingleStore((state) => state.updateCheckinValue);
  const updateProfileDraft = useMingleStore((state) => state.updateProfileDraft);
  const completeProfile = useMingleStore((state) => state.completeProfile);
  const syncFromRepository = useMingleStore((state) => state.syncFromRepository);
  const onboardingProfileUploadSubjectRef = useRef("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [onboardingDraftParticipantId, setOnboardingDraftParticipantId] = useState<string | null>(null);
  const hasAutoRequestedRef = useRef(false);
  if (!onboardingProfileUploadSubjectRef.current) {
    onboardingProfileUploadSubjectRef.current =
      globalThis.crypto?.randomUUID?.() ??
      `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
  const profileUploadSubjectId =
    checkinDraft.resolution?.participantId ?? onboardingProfileUploadSubjectRef.current;

  if (!snapshot) {
    return <LoadingView />;
  }

  const hasEntryContext = checkinDraft.flowState === "SUCCESS" && Boolean(checkinDraft.resolution);

  useEffect(() => {
    if (checkinDraft.value.trim() || typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const branchId = params.get("branchId")?.trim() ?? "";
    const tableId = params.get("tableId")?.trim() ?? "";
    const code = params.get("code")?.trim() ?? "";
    if (!branchId || !tableId) {
      return;
    }
    const canonicalQr = `mingle://table/${branchId}/${tableId}${code ? `?code=${code}` : ""}`;
    if (!parseCheckinQrValue(canonicalQr)) {
      return;
    }
    updateCheckinValue(canonicalQr);
  }, [checkinDraft.value, updateCheckinValue]);

  useEffect(() => {
    if (
      hasAutoRequestedRef.current ||
      hasEntryContext ||
      checkinDraft.isSubmitting ||
      !checkinDraft.value.trim()
    ) {
      return;
    }
    hasAutoRequestedRef.current = true;
    track("ENTRY", { source: "qr" });
    void verifyCheckin();
  }, [
    checkinDraft.flowState,
    checkinDraft.isSubmitting,
    checkinDraft.resolution,
    checkinDraft.value,
    hasEntryContext,
    verifyCheckin
  ]);

  return (
    <main className="customer-shell" data-phase="CHECKIN">
      <div className="customer-stage onboarding-stage">
        <Surface className="customer-hero">
          <div className="hero-copy-stack">
            <h1 className="hero-title">프로필 설정</h1>
          </div>
        </Surface>

        {!hasEntryContext ? (
          <Surface>
            <EmptyState
              title="입장 실패"
              description="QR 다시 스캔"
            />
            {checkinDraft.error ? <p className="field-error">{checkinDraft.error}</p> : null}
          </Surface>
        ) : (
          <div className="customer-grid">
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="온보딩"
                  title="기본 정보"
                  description=""
                />
                <ProfileFormFields
                  mode="onboarding"
                  value={profileDraft}
                  testIdPrefix="profile"
                  onChange={updateProfileDraft}
                  profileUploadSubjectId={profileUploadSubjectId}
                  avatarGender={checkinDraft.resolution?.gender ?? "M"}
                  checkinPhone={checkinDraft.resolution?.phone ?? ""}
                  onStepAdvance={async ({ step, data }) => {
                    if (!checkinDraft.resolution?.sessionId || !checkinDraft.resolution.tableId) {
                      return;
                    }
                    const response = await fetch("/api/customer/profile/step", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                      },
                      body: JSON.stringify({
                        sessionId: checkinDraft.resolution.sessionId,
                        tableId: checkinDraft.resolution.tableId,
                        step,
                        data,
                        draftParticipantId: onboardingDraftParticipantId ?? undefined
                      })
                    });
                    if (!response.ok) {
                      const message = await response.text();
                      throw new Error(message || "임시 저장에 실패했습니다.");
                    }
                    const payload = (await response.json()) as { draftParticipantId: string };
                    setOnboardingDraftParticipantId(payload.draftParticipantId);
                  }}
                  completeButtonDisabled={isSubmittingProfile}
                  onComplete={() => {
                    triggerHaptic("light");
                    setIsSubmittingProfile(true);
                    const commit = async () => {
                      if (onboardingDraftParticipantId) {
                        const response = await fetch("/api/customer/enter", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json"
                          },
                          body: JSON.stringify({
                            draftParticipantId: onboardingDraftParticipantId
                          })
                        });
                        if (!response.ok) {
                          throw new Error(await response.text());
                        }
                        await syncFromRepository();
                        return true;
                      }
                      return completeProfile();
                    };
                    void commit()
                      .then((ok) => {
                        track("ONBOARD", { success: ok });
                        if (ok) {
                          triggerHaptic("success");
                        } else {
                          triggerHaptic("error");
                        }
                      })
                      .finally(() => {
                        setIsSubmittingProfile(false);
                      });
                  }}
                />
              </Surface>
            </div>
            <div className="customer-side-column" />
          </div>
        )}
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
            <p className="eyebrow">매치 결과</p>
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
                eyebrow="결과"
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
                      <Button block disabled>
                        다시 이야기 나누기 (준비중)
                      </Button>
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
  useDesignQA();
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
  const submitContactExchangeConsent = useMingleStore((state) => state.submitContactExchangeConsent);
  const respondToContent = useMingleStore((state) => state.respondToContent);

  const [stagedRevealOpen, setStagedRevealOpen] = useState(false);
  const [isRevealLoading, setIsRevealLoading] = useState(false);
  const [revealVisibleCount, setRevealVisibleCount] = useState(0);
  const revealStartTimerRef = useRef<number | null>(null);
  const revealStepTimerRef = useRef<number | null>(null);
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
  const [contactTargetId, setContactTargetId] = useState("");
  const [participantFilter, setParticipantFilter] = useState<ParticipantFilter>("OPPOSITE");
  const [participantPage, setParticipantPage] = useState(1);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantRecord | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactExchangeMethod>({
    realName: "",
    phone: "",
    kakaoId: "",
    instagramId: ""
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
  const openTablePickWindow = useMemo(
    () =>
      (snapshot.tablePickWindows ?? []).find(
        (window) => window.sessionId === snapshot.session.id && window.status === "OPEN"
      ) ?? null,
    [snapshot.session.id, snapshot.tablePickWindows]
  );
  const tablePickCandidates = useMemo(
    () =>
      snapshot.participants.filter(
        (candidate) =>
          candidate.id !== participant.id &&
          candidate.sessionId === snapshot.session.id &&
          candidate.tableId === participant.tableId &&
          candidate.gender !== participant.gender &&
          ["ACTIVE", "IDLE"].includes(snapshot.participantStatusMap?.[candidate.id] ?? "ACTIVE")
      ),
    [participant.gender, participant.id, participant.tableId, snapshot.participantStatusMap, snapshot.participants, snapshot.session.id]
  );
  const myTablePicks = useMemo(() => {
    if (!openTablePickWindow) {
      return { wantToKnowParticipantId: null, funnyParticipantId: null };
    }
    const mine = (snapshot.tableImpressionPicks ?? []).filter(
      (pick) =>
        pick.sessionId === snapshot.session.id &&
        pick.rotationIndex === openTablePickWindow.rotationIndex &&
        pick.pickerParticipantId === participant.id
    );
    return {
      wantToKnowParticipantId:
        mine.find((pick) => pick.pickType === "WANT_TO_KNOW")?.targetParticipantId ?? null,
      funnyParticipantId: mine.find((pick) => pick.pickType === "FUNNY")?.targetParticipantId ?? null
    };
  }, [openTablePickWindow, participant.id, snapshot.session.id, snapshot.tableImpressionPicks]);
  const effectiveLiveContent = useMemo(() => {
    if (stageContent.liveContent) {
      return stageContent.liveContent;
    }
    if (!openTablePickWindow) {
      return null;
    }
    return {
      id: `table-pick-window-${openTablePickWindow.rotationIndex}`,
      templateId: "table-impression-pick",
      kind: "table_impression_pick" as const,
      title: "테이블 픽",
      description: "같은 테이블에서 선택해주세요",
      ctaLabel: "제출",
      scope: "TABLE" as const,
      targetTableId: participant.tableId,
      createdAt: openTablePickWindow.openedAt,
      expiresAt: null,
      status: "LIVE" as const,
      options: [],
      message: null
    };
  }, [openTablePickWindow, participant.tableId, stageContent.liveContent]);
  const heartInbox = useMemo(
    () => buildRevealState(snapshot.session, participant, snapshot.hearts, snapshot.participants),
    [participant, snapshot]
  );
  const reportTargets = useMemo(
    () => encounterParticipants.filter((candidate) => candidate.id !== participant.id),
    [encounterParticipants, participant.id]
  );
  const latestAnnouncement = useMemo(() => snapshot.announcements[0] ?? null, [snapshot.announcements]);
  const mutualMatches = useMemo(
    () => buildMutualMatches(snapshot, participant.id),
    [participant.id, snapshot]
  );
  const sentHeartRecipientIds = useMemo(
    () =>
      new Set(
        snapshot.hearts
          .filter((heart) => heart.senderId === participant.id)
          .map((heart) => heart.recipientId)
      ),
    [participant.id, snapshot.hearts]
  );
  const rotationInstruction = getRotationInstructionForParticipant(snapshot, participant.id);
  const showRotationModal = isRotationInstructionActive(rotationInstruction);
  const phaseGuideMessage = getPhaseSingleMessage(snapshot.session.phase, stagedRevealOpen && heartInbox.canReveal);
  const filteredParticipants = useMemo(
    () =>
      filterParticipants(
        snapshot.participants,
        participant,
        participantFilter,
        snapshot.participantStatusMap ?? {}
      ),
    [participant, participantFilter, snapshot.participantStatusMap, snapshot.participants]
  );
  const participantPageResult = useMemo(
    () => paginate(filteredParticipants, participantPage, 10),
    [filteredParticipants, participantPage]
  );
  const { visible: showScrollTop, scrollToTop } = useScrollTopButton();

  useEffect(() => {
    setParticipantPage(1);
  }, [participantFilter]);

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

  const handleSendHeart = async (recipientId: string) => {
    triggerHaptic("light");
    if (sentHeartRecipientIds.has(recipientId)) {
      useMingleStore.setState({ toast: createToast("info", "이미 하트를 보낸 사람입니다") });
      triggerHaptic("error");
      return;
    }
    if (participant.heartsRemaining <= 0) {
      useMingleStore.setState({ toast: createToast("warning", "남은 하트가 없어요") });
      triggerHaptic("error");
      return;
    }
    const ok = await sendHeart(recipientId);
    if (ok) {
      track("HEART", { recipientId });
      useMingleStore.setState({ toast: createToast("success", "하트를 보냈어요") });
      triggerHaptic("success");
    }
  };

  useEffect(() => {
    if (!stagedRevealOpen || !heartInbox.canReveal) {
      setIsRevealLoading(false);
      setRevealVisibleCount(0);
      if (revealStartTimerRef.current) {
        window.clearTimeout(revealStartTimerRef.current);
      }
      if (revealStepTimerRef.current) {
        window.clearInterval(revealStepTimerRef.current);
      }
      return;
    }

    setIsRevealLoading(true);
    setRevealVisibleCount(0);
    revealStartTimerRef.current = window.setTimeout(() => {
      triggerHaptic("medium");
      setIsRevealLoading(false);
      setRevealVisibleCount(1);
      revealStepTimerRef.current = window.setInterval(() => {
        setRevealVisibleCount((current) => {
          const next = current + 1;
          return next > heartInbox.visibleSenders.length ? heartInbox.visibleSenders.length : next;
        });
      }, 100);
    }, 300);

    return () => {
      if (revealStartTimerRef.current) {
        window.clearTimeout(revealStartTimerRef.current);
      }
      if (revealStepTimerRef.current) {
        window.clearInterval(revealStepTimerRef.current);
      }
    };
  }, [heartInbox.canReveal, heartInbox.visibleSenders.length, stagedRevealOpen]);

  return (
    <main className="customer-shell" data-phase={snapshot.session.phase}>
      <div className="customer-stage">
        <Surface className="customer-app-topbar">
          <div className="customer-sticky-status-row">
            <strong>
              {snapshot.session.branchName} · {snapshot.session.name}
            </strong>
            <span>
              {formatOperationalPhaseLabel(snapshot.session.phase)} · 하트 {participant.heartsRemaining}개
            </span>
          </div>
        </Surface>

        <Surface className="customer-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">테이블 중심 진행</p>
            <h1 className="hero-title">
              {participant.nickname}님, 지금은 {formatTableName(participant.tableId)} 라운드입니다.
            </h1>
            <p className="hero-description">{phaseGuideMessage}</p>
          </div>
        </Surface>

        {customerTab === "all" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="참가자"
                  title="참가자 목록"
                  description={phaseGuideMessage}
                />
                <ParticipantFilterTabs value={participantFilter} onChange={setParticipantFilter} />
                <div className="participant-grid">
                  {participantPageResult.items.map((member) => (
                    <ParticipantCard
                      key={member.id}
                      phase={snapshot.session.phase}
                      participant={member}
                      canSendHeart={!sentHeartRecipientIds.has(member.id) && participant.heartsRemaining > 0}
                      onOpen={() => setSelectedParticipant(member)}
                      onSendHeart={() => void handleSendHeart(member.id)}
                    />
                  ))}
                </div>
                <ParticipantPagination
                  page={participantPageResult.page}
                  totalPages={participantPageResult.totalPages}
                  onPrev={() => setParticipantPage((prev) => Math.max(1, prev - 1))}
                  onNext={() =>
                    setParticipantPage((prev) => Math.min(participantPageResult.totalPages, prev + 1))
                  }
                />
              </Surface>
            </div>

            <div className="customer-side-column">
              <RevealProgressCard heartsRemaining={participant.heartsRemaining} />
              {latestAnnouncement ? (
                <Surface>
                  <SectionHeader
                    eyebrow="공지"
                    title="운영 안내"
                    description={latestAnnouncement.message}
                  />
                </Surface>
              ) : null}
            </div>
          </div>
        ) : null}

        {customerTab === "table" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <TableStageCard
                participant={participant}
                liveContent={null}
                responseCount={stageContent.responseCount}
                alreadyResponded={stageContent.alreadyResponded}
                anonymousMessageCount={
                  snapshot.anonymousMessages.filter(
                    (message) =>
                      message.senderParticipantId === participant.id &&
                      message.sessionId === participant.sessionId
                  ).length
                }
                tablePickWindowOpen={Boolean(openTablePickWindow)}
                tablePickRotationIndex={openTablePickWindow?.rotationIndex ?? null}
                tablePickCandidates={tablePickCandidates}
                tablePickExisting={myTablePicks}
                encounterParticipants={encounterParticipants}
                onRespond={respondToContent}
              />
              <Surface>
                <SectionHeader
                  eyebrow="내 테이블"
                  title={`${formatTableName(participant.tableId)} 참가자`}
                  description="현재 같은 테이블의 참가자입니다."
                />
                <div className="participant-grid">
                  {currentTableMembers.map((member) => (
                    <article key={member.id} className="participant-card">
                      <div className="participant-head">
                        <UserPhoto photoUrl={member.photoUrl} gender={member.gender} size={52} />
                        <div className="participant-copy">
                          <strong>{member.nickname}</strong>
                          <p>{member.job}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        ) : null}

        {customerTab === "content" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <TableStageCard
                participant={participant}
                liveContent={effectiveLiveContent}
                responseCount={stageContent.responseCount}
                alreadyResponded={stageContent.alreadyResponded}
                anonymousMessageCount={
                  snapshot.anonymousMessages.filter(
                    (message) =>
                      message.senderParticipantId === participant.id &&
                      message.sessionId === participant.sessionId
                  ).length
                }
                tablePickWindowOpen={Boolean(openTablePickWindow)}
                tablePickRotationIndex={openTablePickWindow?.rotationIndex ?? null}
                tablePickCandidates={tablePickCandidates}
                tablePickExisting={myTablePicks}
                encounterParticipants={encounterParticipants}
                onRespond={respondToContent}
              />
              <RevealProgressCard heartsRemaining={participant.heartsRemaining} />

              <Surface>
                <SectionHeader
                  eyebrow="받은 하트"
                  title={`받은 하트 ${heartInbox.receivedCount}개`}
                  description={heartInbox.status}
                />
              </Surface>

              {heartInbox.canReveal && !stagedRevealOpen ? (
                <Surface>
                  <SectionHeader
                    eyebrow="공개"
                    title="결과를 확인할 수 있어요"
                    description="서로 관심이 확인되었습니다"
                    actions={
                      <Button
                        onClick={() => {
                          triggerHaptic("medium");
                          setStagedRevealOpen(true);
                        }}
                      >
                        보낸 사람 보기
                      </Button>
                    }
                  />
                </Surface>
              ) : null}

              {heartInbox.canReveal ? (
                stagedRevealOpen ? (
                  <Surface className="reveal-sequence-surface">
                    <SectionHeader
                      eyebrow="공개 완료"
                      title="서로 관심이 확인되었습니다"
                      description="서로 관심이 확인되었습니다"
                    />
                    {isRevealLoading ? <p className="field-help">결과를 불러오고 있어요...</p> : null}
                    <div className="participant-grid">
                      {heartInbox.visibleSenders.slice(0, revealVisibleCount).map((sender) => (
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
                          <Button className="heart-send-button" onClick={() => void handleSendHeart(sender.id)}>
                            하트 보내기
                          </Button>
                        </article>
                      ))}
                    </div>
                  </Surface>
                ) : null
              ) : (
                <Surface>
                  <SectionHeader
                    eyebrow="잠김"
                    title="아직 결과를 확인할 수 없어요"
                    description={phaseGuideMessage}
                  />
                </Surface>
              )}

              {heartInbox.canReveal && stagedRevealOpen ? (
                <Surface>
                  <SectionHeader
                    eyebrow="연락처 교환"
                    title="연락처 교환"
                    description="서로 동의해야 연락처가 공개됩니다"
                  />
                  <p className="field-help">서로 동의해야 연락처가 공개됩니다</p>

                  {mutualMatches.length ? (
                    <>
                      <label className="field">
                        <span>대상 선택</span>
                        <select
                          value={contactTargetId}
                          onChange={(event) => setContactTargetId(event.target.value)}
                        >
                          <option value="">선택</option>
                          {mutualMatches.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.nickname}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="form-grid">
                        <label className="field">
                          <span>본명 (선택)</span>
                          <input
                            value={contactDraft.realName ?? ""}
                            onChange={(event) =>
                              setContactDraft((current) => ({ ...current, realName: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>전화번호</span>
                          <input
                            value={contactDraft.phone ?? ""}
                            onChange={(event) =>
                              setContactDraft((current) => ({ ...current, phone: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>카카오톡 ID</span>
                          <input
                            value={contactDraft.kakaoId ?? ""}
                            onChange={(event) =>
                              setContactDraft((current) => ({ ...current, kakaoId: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>인스타그램 ID</span>
                          <input
                            value={contactDraft.instagramId ?? ""}
                            onChange={(event) =>
                              setContactDraft((current) => ({ ...current, instagramId: event.target.value }))
                            }
                          />
                        </label>
                      </div>

                      <Button
                        block
                        disabled={
                          !contactTargetId ||
                          !(
                            contactDraft.phone?.trim() ||
                            contactDraft.kakaoId?.trim() ||
                            contactDraft.instagramId?.trim()
                          )
                        }
                        onClick={async () => {
                          triggerHaptic("light");
                          const ok = await submitContactExchangeConsent(contactTargetId, contactDraft, true);
                          if (ok) {
                            triggerHaptic("success");
                            setContactDraft({ realName: "", phone: "", kakaoId: "", instagramId: "" });
                          }
                        }}
                      >
                        연락처 교환 요청
                      </Button>
                      {!contactTargetId ||
                      !(
                        contactDraft.phone?.trim() ||
                        contactDraft.kakaoId?.trim() ||
                        contactDraft.instagramId?.trim()
                      ) ? (
                        <p className="field-help">대상 선택 + 연락수단 1개 이상 입력 후 제출할 수 있어요.</p>
                      ) : null}

                      <div className="compact-stack customer-contact-status-list">
                        {mutualMatches.map((candidate) => {
                          const exchange = getContactExchangeBetween(snapshot, participant.id, candidate.id);
                          return (
                            <div key={candidate.id} className="compact-row">
                              <strong>{candidate.nickname}</strong>
                              <span>
                                {exchange ? formatContactExchangeStatus(exchange.status) : "공유 전"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="연락처 교환 대상이 없습니다."
                      description="서로 하트를 보낸 상대가 있을 때만 요청할 수 있습니다."
                    />
                  )}
                </Surface>
              ) : null}
            </div>
          </div>
        ) : null}

        {customerTab === "me" ? (
          <div className="customer-grid">
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="프로필"
                  title="내 프로필 수정"
                  description="운영 중에도 기본 프로필 정보를 정리할 수 있습니다."
                />
                <ProfileFormFields
                  value={profileEdit}
                  testIdPrefix="settings"
                  onChange={(field, value) =>
                    setProfileEdit((current) => ({ ...current, [field]: value }))
                  }
                  profileUploadSubjectId={participant.id}
                  avatarGender={participant.gender}
                />
                <Button block onClick={() => void saveProfile()}>
                  프로필 저장
                </Button>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="2차 라운드"
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
                  eyebrow="안전 신고"
                  title="불편한 상황 신고하기"
                  description="불편한 상황이 있으면 바로 알려주세요. 운영자가 확인해요."
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
                    <span>불편했던 이유</span>
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

            <div className="customer-side-column" />
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

        <Surface className="customer-bottom-tabs">
          <div className="segmented">
            {(Object.keys(TAB_LABELS) as CustomerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn("segmented-item", customerTab === tab && "segmented-item-active")}
                onClick={() => setCustomerTab(tab)}
                onMouseDown={() => triggerHaptic("light")}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </Surface>
      </div>
      <ParticipantDetailSheet
        open={Boolean(selectedParticipant)}
        phase={snapshot.session.phase}
        participant={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        onSendHeart={(participantId) => void handleSendHeart(participantId)}
      />
      <MgScrollTopButton show={showScrollTop && (customerTab === "all" || customerTab === "table" || customerTab === "content")} onClick={scrollToTop} />
    </main>
  );
}

export function CustomerApp() {
  const hydrated = useMingleStore((state) => state.hydrated);
  const participant = useMingleStore(selectCurrentParticipant);
  const snapshot = useMingleStore((state) => state.snapshot);
  const snapshotLoadErrorCode = useMingleStore((state) => state.snapshotLoadErrorCode);
  const hydrate = useMingleStore((state) => state.hydrate);

  if (!hydrated) {
    return <LoadingView />;
  }

  if (!snapshot) {
    return (
      <main className="customer-shell" data-phase="CHECKIN">
        <div className="customer-stage">
          <Surface>
            <EmptyState
              title="입장 정보를 확인할 수 없어요."
              description="QR을 다시 스캔해주세요."
            />
            {snapshotLoadErrorCode ? (
              <p className="field-help customer-snapshot-help">
                문제가 계속되면 운영팀에 코드({snapshotLoadErrorCode})를 전달해주세요.
              </p>
            ) : null}
            <div className="customer-snapshot-form">
              <Button
                variant="secondary"
                onClick={() => {
                  triggerHaptic("light");
                  void hydrate();
                }}
              >
                다시 시도
              </Button>
            </div>
          </Surface>
        </div>
      </main>
    );
  }

  if (!participant) {
    return <OnboardingView />;
  }

  if (snapshot.session.phase === "MATCH_END") {
    return <MatchEndView participant={participant} />;
  }

  return <CustomerView participant={participant} />;
}
