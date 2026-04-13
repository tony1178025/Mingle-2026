"use client";

import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useMemo, useState } from "react";
import { ProfilePhotoUploader } from "@/components/customer/ProfilePhotoUploader";
import { PushNotificationCard } from "@/components/customer/PushNotificationCard";
import { mingleMotion } from "@/components/motion/tokens";
import { UserPhoto } from "@/components/shared/Avatar";
import { Badge, Button, SectionHeader, Surface } from "@/components/shared/ui";
import { buildTableSummaries } from "@/engine/heat";
import { buildRevealState } from "@/engine/reveal";
import { createCheckinCopy } from "@/features/checkin/model";
import { buildActiveContentView } from "@/features/content/library";
import {
  PROFILE_AGE_OPTIONS,
  PROFILE_ANIMAL_OPTIONS,
  PROFILE_ENERGY_OPTIONS,
  PROFILE_JOB_OPTIONS
} from "@/features/profile/options";
import { cn, formatCurrency, formatTableName, REPORT_REASONS } from "@/lib/mingle";
import { selectCurrentParticipant, useMingleStore } from "@/stores/useMingleStore";
import type { CustomerTab, ParticipantRecord, RevealStateKey, TableSummary } from "@/types/mingle";

const TAB_LABELS: Record<CustomerTab, string> = {
  explore: "탐색",
  hearts: "하트",
  content: "콘텐츠",
  settings: "설정"
};

function describeAtmosphere(quality: number) {
  if (quality >= 82) return "첫 대화가 자연스럽게 이어지는 안정적인 테이블입니다.";
  if (quality >= 72) return "조금만 리듬이 붙으면 금방 분위기가 살아날 자리입니다.";
  return "운영 개입이나 질문 카드가 들어가면 분위기가 더 좋아질 수 있습니다.";
}

function formatPhaseLabel(phase: string) {
  if (phase === "CHECKIN") return "체크인";
  if (phase === "ROUND_1") return "1부";
  if (phase === "ROUND_2") return "2부";
  return "종료";
}

function describeRevealStage(key: RevealStateKey) {
  if (key === "round1-count-only") return "1부에서는 받은 수만 확인";
  if (key === "round2-waiting-admin") return "운영 공개를 기다리는 중";
  if (key === "round2-waiting-user") return "무료 하트 3개 사용이 먼저 필요";
  return "공개 조건이 충족되어 보낸 사람이 열렸습니다";
}

function LoadingView() {
  return (
    <main className="customer-shell" data-phase="ROUND_1">
      <div className="customer-stage">
        <Surface className="customer-hero skeleton-block" />
        <div className="customer-stack">
          <Surface className="skeleton-block" />
          <Surface className="skeleton-block" />
        </div>
      </div>
    </main>
  );
}

function OnboardingView() {
  const checkinDraft = useMingleStore((state) => state.checkinDraft);
  const profileDraft = useMingleStore((state) => state.profileDraft);
  const updateCheckinMode = useMingleStore((state) => state.updateCheckinMode);
  const updateCheckinValue = useMingleStore((state) => state.updateCheckinValue);
  const updateStaffNote = useMingleStore((state) => state.updateStaffNote);
  const verifyCheckin = useMingleStore((state) => state.verifyCheckin);
  const updateProfileDraft = useMingleStore((state) => state.updateProfileDraft);
  const completeProfile = useMingleStore((state) => state.completeProfile);

  const copy = createCheckinCopy(checkinDraft.mode);
  const jobOptions = profileDraft.jobCategory ? PROFILE_JOB_OPTIONS[profileDraft.jobCategory] ?? [] : [];

  return (
    <main className="customer-shell" data-phase="CHECKIN">
      <div className="customer-stage onboarding-stage">
        <Surface className="customer-hero">
          <div>
            <p className="eyebrow">MINGLE</p>
            <h1 className="hero-title">테이블의 첫 인상을 흐리지 않는 체크인</h1>
            <p className="hero-description">
              QR, 4자리 코드, 스태프 확인 중 가장 쉬운 방식으로 입장하고, 꼭 필요한 프로필만 입력하면
              바로 세션에 들어갈 수 있습니다.
            </p>
          </div>
          <div className="hero-side-list">
            <div>
              <span className="hero-side-kicker">Step 1</span>
              <strong>체크인</strong>
            </div>
            <div>
              <span className="hero-side-kicker">Step 2</span>
              <strong>프로필 입력</strong>
            </div>
            <div>
              <span className="hero-side-kicker">Step 3</span>
              <strong>테이블 입장</strong>
            </div>
          </div>
        </Surface>

        <div className="customer-grid onboarding-grid">
          <Surface>
            <SectionHeader eyebrow="CHECK-IN" title={copy.title} description={copy.description} />
            <div className="segmented">
              {(["qr", "code", "staff"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn("segmented-item", checkinDraft.mode === mode && "segmented-item-active")}
                  onClick={() => updateCheckinMode(mode)}
                  data-testid={`checkin-mode-${mode}`}
                >
                  {mode === "qr" ? "QR" : mode === "code" ? "4자리 코드" : "스태프 확인"}
                </button>
              ))}
            </div>

            {checkinDraft.mode !== "staff" ? (
              <label className="field">
                <span>입장 값</span>
                <input
                  value={checkinDraft.value}
                  onChange={(event) => updateCheckinValue(event.target.value)}
                  placeholder={copy.placeholder}
                  inputMode={checkinDraft.mode === "code" ? "numeric" : "text"}
                  autoComplete={checkinDraft.mode === "code" ? "one-time-code" : "off"}
                  maxLength={checkinDraft.mode === "code" ? 4 : 48}
                  pattern={checkinDraft.mode === "code" ? "[0-9]{4}" : undefined}
                  aria-invalid={Boolean(checkinDraft.error)}
                  aria-describedby="checkin-policy-hint"
                  data-testid="checkin-input"
                />
              </label>
            ) : (
              <label className="field">
                <span>스태프 확인 메모</span>
                <input
                  value={checkinDraft.staffNote}
                  onChange={(event) => updateStaffNote(event.target.value)}
                  placeholder={copy.placeholder}
                  autoComplete="off"
                  maxLength={48}
                  aria-describedby="checkin-policy-hint"
                  data-testid="checkin-staff-note"
                />
              </label>
            )}

            {checkinDraft.error ? <p className="field-error">{checkinDraft.error}</p> : null}
            <p className="field-hint" id="checkin-policy-hint">
              성별은 고객이 다시 입력하지 않습니다. 예약 또는 현장 체크인 정보에서 운영 메타데이터로만
              연결됩니다.
            </p>

            {checkinDraft.resolution ? (
              <div className="compact-row">
                <strong>{checkinDraft.resolution.reservationLabel}</strong>
                <span>{checkinDraft.resolution.reservationId}</span>
              </div>
            ) : null}

            <Button onClick={() => void verifyCheckin()} block data-testid="checkin-verify">
              체크인 확인
            </Button>
          </Surface>

          <Surface>
            <SectionHeader
              eyebrow="PROFILE"
              title="운영에 필요한 정보만 받습니다"
              description="닉네임, 나이, 직업, 키, 동물상, E/I만 입력하면 됩니다. 사진은 선택입니다."
            />

            <div className="form-grid">
              <label className="field">
                <span>닉네임</span>
                <input
                  value={profileDraft.nickname}
                  onChange={(event) => updateProfileDraft("nickname", event.target.value)}
                  maxLength={8}
                  autoComplete="nickname"
                  placeholder="테이블에서 불릴 이름"
                  data-testid="profile-nickname"
                />
              </label>

              <label className="field">
                <span>나이</span>
                <select
                  value={profileDraft.age}
                  onChange={(event) => updateProfileDraft("age", event.target.value)}
                  data-testid="profile-age"
                >
                  <option value="">선택</option>
                  {PROFILE_AGE_OPTIONS.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>직업 카테고리</span>
                <select
                  value={profileDraft.jobCategory}
                  onChange={(event) => {
                    updateProfileDraft("jobCategory", event.target.value);
                    updateProfileDraft("job", "");
                  }}
                  autoComplete="organization-title"
                  data-testid="profile-job-category"
                >
                  <option value="">선택</option>
                  {Object.keys(PROFILE_JOB_OPTIONS).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>직업</span>
                <select
                  value={profileDraft.job}
                  onChange={(event) => updateProfileDraft("job", event.target.value)}
                  autoComplete="organization-title"
                  data-testid="profile-job"
                >
                  <option value="">선택</option>
                  {jobOptions.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>키</span>
                <input
                  value={profileDraft.heightCm}
                  onChange={(event) => updateProfileDraft("heightCm", event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="예: 170"
                  maxLength={3}
                  autoComplete="off"
                  data-testid="profile-height"
                />
              </label>

              <label className="field">
                <span>동물상</span>
                <select
                  value={profileDraft.animalType}
                  onChange={(event) => updateProfileDraft("animalType", event.target.value)}
                  data-testid="profile-animal"
                >
                  <option value="">선택</option>
                  {PROFILE_ANIMAL_OPTIONS.map((animal) => (
                    <option key={animal} value={animal}>
                      {animal}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field field-span-2">
                <span>E / I</span>
                <div className="choice-grid">
                  {PROFILE_ENERGY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "choice-card",
                        profileDraft.energyType === option.id && "choice-card-active"
                      )}
                      onClick={() => updateProfileDraft("energyType", option.id)}
                      data-testid={`profile-energy-${option.id.toLowerCase()}`}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ProfilePhotoUploader
                value={profileDraft.photoUrl}
                onChange={(url) => updateProfileDraft("photoUrl", url)}
              />
            </div>

            <Button onClick={() => void completeProfile()} block data-testid="complete-profile">
              프로필 완료하고 입장
            </Button>
          </Surface>
        </div>
      </div>
    </main>
  );
}

function TableSummaryRail({
  selectedTableId,
  tables,
  onSelect
}: {
  selectedTableId: number;
  tables: TableSummary[];
  onSelect: (tableId: number) => void;
}) {
  return (
    <div className="table-pill-row">
      {tables.map((table) => (
        <motion.button
          key={table.tableId}
          type="button"
          className={cn("table-pill", selectedTableId === table.tableId && "table-pill-active")}
          whileHover={mingleMotion.cardLift.whileHover}
          whileTap={mingleMotion.cardLift.whileTap}
          onClick={() => onSelect(table.tableId)}
        >
          <span>{formatTableName(table.tableId)}</span>
          <strong>{Math.round(table.quality)}</strong>
        </motion.button>
      ))}
    </div>
  );
}

function ParticipantCard({
  participant,
  currentParticipant,
  onPreview,
  onSendHeart
}: {
  participant: ParticipantRecord;
  currentParticipant: ParticipantRecord;
  onPreview: (participantId: string) => void;
  onSendHeart: (participantId: string) => void;
}) {
  const disabled = participant.id === currentParticipant.id;

  return (
        <motion.article className="participant-card" whileHover={mingleMotion.cardLift.whileHover}>
      <div className="participant-head">
        <UserPhoto photoUrl={participant.photoUrl} gender={participant.gender} size={56} />
        <div className="participant-copy">
          <strong>{participant.nickname}</strong>
          <p>
            {participant.age}세 · {participant.job}
          </p>
        </div>
      </div>
      <div className="badge-row">
        <Badge tone="accent">{participant.energyType}</Badge>
        <Badge tone="neutral">{participant.animalType}</Badge>
        <Badge tone={participant.tier === "A" ? "warning" : participant.tier === "B" ? "success" : "neutral"}>
          {participant.tier}-{participant.subTier}
        </Badge>
      </div>
      <div className="participant-facts">
        <span>{participant.jobCategory}</span>
        <span>{participant.heightCm}cm</span>
      </div>
      <div className="button-row">
        <Button variant="ghost" onClick={() => onPreview(participant.id)}>
          프로필 보기
        </Button>
        <motion.div {...mingleMotion.heartPress}>
          <Button
            onClick={() => onSendHeart(participant.id)}
            disabled={disabled}
            data-testid={`send-heart-${participant.id}`}
          >
            하트 보내기
          </Button>
        </motion.div>
      </div>
    </motion.article>
  );
}

function CustomerView({ participant }: { participant: ParticipantRecord }) {
  const snapshot = useMingleStore((state) => state.snapshot)!;
  const customerTab = useMingleStore((state) => state.customerTab);
  const setCustomerTab = useMingleStore((state) => state.setCustomerTab);
  const selectedTableId = useMingleStore((state) => state.selectedTableId);
  const setSelectedTableId = useMingleStore((state) => state.setSelectedTableId);
  const toast = useMingleStore((state) => state.toast);
  const dismissToast = useMingleStore((state) => state.dismissToast);
  const sendHeart = useMingleStore((state) => state.sendHeart);
  const purchaseHeartBundle = useMingleStore((state) => state.purchaseHeartBundle);
  const submitReport = useMingleStore((state) => state.submitReport);
  const viewParticipantProfile = useMingleStore((state) => state.viewParticipantProfile);

  const [reportTarget, setReportTarget] = useState("");
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");

  const tables = useMemo(
    () => buildTableSummaries(snapshot.participants, snapshot.session.tableCount),
    [snapshot.participants, snapshot.session.tableCount]
  );
  const heartInbox = useMemo(
    () => buildRevealState(snapshot.session, participant, snapshot.hearts, snapshot.participants),
    [participant, snapshot.hearts, snapshot.participants, snapshot.session]
  );

  const currentTable = useMemo(
    () => tables.find((table) => table.tableId === selectedTableId) ?? tables[0],
    [selectedTableId, tables]
  );
  const currentParticipantTable = useMemo(
    () => tables.find((table) => table.tableId === participant.tableId),
    [participant.tableId, tables]
  );
  const reportTargets = useMemo(
    () => snapshot.participants.filter((candidate) => candidate.id !== participant.id),
    [participant.id, snapshot.participants]
  );
  const heroSignals = useMemo(
    () => [
      {
        label: "현재 라운드",
        value: formatPhaseLabel(snapshot.session.phase),
        caption:
          snapshot.session.phase === "ROUND_2"
            ? "공개와 선택의 라운드"
            : "탐색과 분위기 읽기에 집중하는 라운드"
      },
      {
        label: "내 자리",
        value: formatTableName(participant.tableId),
        caption: "첫 자리는 수동이어도 다음 회전부터 구조적으로 정렬됩니다"
      },
      {
        label: "공개 상태",
        value: describeRevealStage(heartInbox.key),
        caption: heartInbox.status
      },
      {
        label: "하트 잔여",
        value: `무료 ${Math.max(0, snapshot.session.freeHeartLimit - participant.usedFreeHearts)}개`,
        caption: `유료 ${participant.paidHeartBalance}개 추가 사용 가능`
      }
    ],
    [heartInbox.key, heartInbox.status, participant.paidHeartBalance, participant.tableId, participant.usedFreeHearts, snapshot.session.freeHeartLimit, snapshot.session.phase]
  );
  const reportSubmitDisabled = !reportTarget || reportDetails.trim().length < 8;
  const contentView = useMemo(
    () => buildActiveContentView(snapshot.activeContentIds, snapshot.session.phase),
    [snapshot.activeContentIds, snapshot.session.phase]
  );

  return (
    <main className="customer-shell" data-phase={snapshot.session.phase}>
      <div className="customer-stage">
        <motion.section className="customer-hero" {...mingleMotion.pageEnter}>
          <div>
            <p className="eyebrow">LIVE SESSION</p>
            <h1 className="hero-title">{participant.nickname} 님의 Mingle</h1>
            <p className="hero-description">
              라운드의 감도를 놓치지 않도록, 지금 필요한 정보만 깊이 있게 보여드립니다.
            </p>
          </div>

          <motion.div className="hero-signal-grid" {...mingleMotion.roundShift}>
            {heroSignals.map((signal, index) => (
              <motion.div
                key={signal.label}
                className="hero-signal-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.24 }}
              >
                <span className="hero-side-kicker">{signal.label}</span>
                <strong data-testid={signal.label === "내 자리" ? "current-table-label" : undefined}>
                  {signal.value}
                </strong>
                <p>{signal.caption}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <Surface>
          <div className="segmented">
            {(Object.keys(TAB_LABELS) as CustomerTab[]).map((tab) => (
              <motion.button
                key={tab}
                type="button"
                className={cn("segmented-item", customerTab === tab && "segmented-item-active")}
                onClick={() => startTransition(() => setCustomerTab(tab))}
                whileTap={{ scale: 0.98 }}
              >
                {TAB_LABELS[tab]}
              </motion.button>
            ))}
          </div>
        </Surface>

        <AnimatePresence mode="wait" initial={false}>
          {customerTab === "explore" ? (
          <motion.div key="explore" className="customer-grid" {...mingleMotion.tabPanel}>
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="TABLE-BASED EXPLORE"
                  title="지금 흐름이 살아 있는 테이블을 기준으로 탐색하세요"
                  description="리스트가 아니라 테이블 분위기 중심으로 사람을 읽을 수 있도록 구성했습니다."
                />
                <p className="inner-description">전체 테이블 흐름 보기</p>
                <TableSummaryRail
                  selectedTableId={selectedTableId}
                  tables={tables}
                  onSelect={setSelectedTableId}
                />
              </Surface>

              {currentTable ? (
                <Surface>
                  <SectionHeader
                    eyebrow={formatTableName(currentTable.tableId)}
                    title={`${Math.round(currentTable.quality)}점의 테이블 분위기`}
                    description={describeAtmosphere(currentTable.quality)}
                    actions={
                      <Badge tone={currentTable.heat >= 18 ? "warning" : currentTable.heat <= 10 ? "neutral" : "success"}>
                        Heat {Math.round(currentTable.heat)}
                      </Badge>
                    }
                  />
                  <div className="stats-row">
                    <div className="compact-row">
                      <strong>젠더 균형</strong>
                      <span>차이 {currentTable.genderBalance}</span>
                    </div>
                    <div className="compact-row">
                      <strong>E/I 균형</strong>
                      <span>차이 {currentTable.energyBalance}</span>
                    </div>
                    <div className="compact-row">
                      <strong>반복 만남</strong>
                      <span>{currentTable.repeatMeetings}</span>
                    </div>
                  </div>
                  <div className="participant-grid">
                    {currentTable.participants.map((candidate) => (
                      <ParticipantCard
                        key={candidate.id}
                        participant={candidate}
                        currentParticipant={participant}
                        onPreview={(participantId) => void viewParticipantProfile(participantId)}
                        onSendHeart={(participantId) => void sendHeart(participantId)}
                      />
                    ))}
                  </div>
                </Surface>
              ) : null}
            </div>

            <div className="customer-side-column">
              <Surface>
                <SectionHeader
                  eyebrow="MY TABLE"
                  title={formatTableName(participant.tableId)}
                  description="첫 자리가 다소 수동이어도, 이후 회전은 구조적으로 정리됩니다."
                />
                {currentParticipantTable ? (
                  <div className="admin-stats-row">
                    <div className="compact-row">
                      <strong>받은 하트</strong>
                      <span>{participant.receivedHearts}</span>
                    </div>
                    <div className="compact-row">
                      <strong>보낸 하트</strong>
                      <span>{participant.sentHearts}</span>
                    </div>
                    <div className="compact-row">
                      <strong>프로필 열람</strong>
                      <span>{participant.profileViews}</span>
                    </div>
                  </div>
                ) : null}
              </Surface>

              <Surface className="inner-surface-highlight">
                <SectionHeader
                  eyebrow="ROUND DIFFERENCE"
                  title={snapshot.session.phase === "ROUND_2" ? "2부는 공개와 선택의 라운드" : "1부는 감도와 탐색의 라운드"}
                  description={
                    snapshot.session.phase === "ROUND_2"
                      ? "운영팀 공개와 내 하트 사용량이 맞아야 보낸 사람이 열립니다."
                      : "1부에서는 받은 하트 수만 보이고, 테이블의 분위기를 읽는 데 집중합니다."
                  }
                />
                <div className="compact-stack">
                  <div className="compact-row">
                    <strong>무료 하트 사용</strong>
                    <span>
                      {participant.usedFreeHearts}/{snapshot.session.freeHeartLimit}
                    </span>
                  </div>
                  <div className="compact-row">
                    <strong>유료 하트</strong>
                    <span>{participant.paidHeartBalance}개</span>
                  </div>
                  <div className="compact-row">
                    <strong>공개 단계</strong>
                    <span>{describeRevealStage(heartInbox.key)}</span>
                  </div>
                </div>
              </Surface>
            </div>
          </motion.div>
        ) : null}

        {customerTab === "hearts" ? (
          <motion.div key="hearts" className="customer-grid" {...mingleMotion.tabPanel}>
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="HEARTS"
                  title="하트 인박스"
                  description="1부에는 수만, 2부에는 운영 공개와 내 사용량 조건이 맞을 때만 보낸 사람이 열립니다."
                />
                <div className="stats-row">
                  <div className="metric-card metric-card-accent">
                    <p className="eyebrow">받은 하트</p>
                    <div className="metric-value" data-testid="received-heart-count">
                      {heartInbox.receivedCount}
                    </div>
                    <p className="metric-hint">{heartInbox.status}</p>
                  </div>
                  <div className="metric-card">
                    <p className="eyebrow">남은 무료 하트</p>
                    <div className="metric-value">{heartInbox.remainingFreeHearts}</div>
                    <p className="metric-hint">3개를 모두 써야 2부 공개 조건이 맞춰집니다.</p>
                  </div>
                </div>

                {heartInbox.key === "round2-revealed" ? (
                  <motion.div className="participant-grid" {...mingleMotion.revealUnlock}>
                    {heartInbox.visibleSenders.length ? (
                      heartInbox.visibleSenders.map((sender) => (
                        <article key={sender.id} className="participant-card">
                          <div className="participant-head">
                            <UserPhoto photoUrl={sender.photoUrl} gender={sender.gender} size={52} />
                            <div className="participant-copy">
                              <strong>{sender.nickname}</strong>
                              <p>
                                {sender.job} · {sender.energyType}
                              </p>
                            </div>
                          </div>
                          <div className="badge-row">
                            <Badge tone="accent">{sender.animalType}</Badge>
                            <Badge tone="neutral">{sender.tier}</Badge>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">
                        <h3>아직 받은 하트가 없습니다</h3>
                        <p>다음 테이블에서 더 적극적으로 둘러보며 흐름을 만들어 보세요.</p>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </Surface>
            </div>

            <div className="customer-side-column">
              <Surface className="inner-surface-highlight">
                <SectionHeader
                  eyebrow="PAID HEART"
                  title={`${formatCurrency(snapshot.session.paidHeartBundlePriceKrw)} / 3개`}
                  description="남은 무료 하트를 모두 쓴 뒤에도 더 보내고 싶을 때 유료 하트를 연결합니다."
                />
                <Button onClick={() => void purchaseHeartBundle()} block>
                  유료 하트 충전 안내 보기
                </Button>
              </Surface>
            </div>
          </motion.div>
        ) : null}

        {customerTab === "content" ? (
          <motion.div key="content" {...mingleMotion.tabPanel}>
          <Surface>
            <SectionHeader
              eyebrow="CURATED CONTENT"
              title="분위기를 억지로 흔들지 않는 콘텐츠"
              description="와우 포인트는 소란이 아니라 적당한 밀도와 운영 감각에서 옵니다."
            />
            <div className="content-grid">
              {contentView.map((item) => {
                const live = item.isAdminActivated && item.isPhaseEligible;
                return (
                  <article key={item.id} className="content-card">
                    <div className="badge-row">
                      <Badge tone={live ? "accent" : item.isAdminActivated ? "warning" : "neutral"}>
                        {live ? "LIVE" : item.isAdminActivated ? "대기" : "준비"}
                      </Badge>
                      <Badge tone="neutral">{item.primitive.toUpperCase()}</Badge>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                    <p>{item.detail}</p>
                    {!item.isPhaseEligible && item.isAdminActivated ? (
                      <p className="field-hint">현재 라운드에서는 자동 비활성 상태입니다.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Surface>
          </motion.div>
        ) : null}

        {customerTab === "settings" ? (
          <motion.div key="settings" className="customer-grid" {...mingleMotion.tabPanel}>
            <div className="customer-main-column">
              <Surface>
                <SectionHeader
                  eyebrow="REPORT"
                  title="운영팀 신고"
                  description="불편한 상황은 즉시 전달할 수 있도록 간단하고 직접적인 흐름으로 구성했습니다."
                />
                <div className="form-grid">
                  <label className="field">
                    <span>대상</span>
                    <select
                      value={reportTarget}
                      onChange={(event) => setReportTarget(event.target.value)}
                      aria-describedby="report-policy-hint"
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
                      aria-describedby="report-policy-hint"
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
                      value={reportDetails}
                      onChange={(event) => setReportDetails(event.target.value)}
                      rows={5}
                      maxLength={300}
                      placeholder="운영팀이 바로 이해할 수 있게 상황과 반복 여부를 적어 주세요."
                      aria-describedby="report-policy-hint"
                      data-testid="report-details"
                    />
                  </label>
                </div>
                <p className="field-hint" id="report-policy-hint">
                  대상과 상세 내용 8자 이상을 입력하면 운영팀이 현장 개입 우선순위를 더 정확하게 판단할 수 있습니다.
                </p>
                <Button
                  block
                  disabled={reportSubmitDisabled}
                  data-testid="submit-report"
                  onClick={async () => {
                    if (reportSubmitDisabled) return;
                    const ok = await submitReport(reportTarget, reportReason, reportDetails);
                    if (ok) {
                      setReportDetails("");
                      setReportTarget("");
                      setReportReason(REPORT_REASONS[0]);
                    }
                  }}
                >
                  신고 전달하기
                </Button>
              </Surface>

              <Surface>
                <SectionHeader
                  eyebrow="PRIVACY"
                  title="개인정보와 공개 규칙"
                  description="성별은 운영 메타데이터로만 사용되며, 고객 입력 필드로 다시 노출하지 않습니다."
                />
                <div className="compact-stack">
                  <div className="compact-row">
                    <strong>수집 정보</strong>
                    <span>닉네임, 나이, 직업, 사진, 키, 동물상, E/I</span>
                  </div>
                  <div className="compact-row">
                    <strong>하트 공개</strong>
                    <span>2부 + 운영 공개 ON + 무료 하트 3개 사용 완료</span>
                  </div>
                  <div className="compact-row">
                    <strong>히트 정보</strong>
                    <span>운영 전용이며 고객 화면에는 노출되지 않습니다.</span>
                  </div>
                </div>
              </Surface>
            </div>

            <div className="customer-side-column">
              <PushNotificationCard />
            </div>
          </motion.div>
        ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.message}
              className="toast"
              {...mingleMotion.toast}
              onClick={() => dismissToast()}
            >
              <Badge tone={toast.tone === "success" ? "success" : toast.tone === "warning" ? "warning" : "accent"}>
                {toast.tone.toUpperCase()}
              </Badge>
              <span>{toast.message}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

export function CustomerApp() {
  const hydrated = useMingleStore((state) => state.hydrated);
  const participant = useMingleStore(selectCurrentParticipant);

  if (!hydrated) {
    return <LoadingView />;
  }

  if (!participant) {
    return <OnboardingView />;
  }

  return <CustomerView participant={participant} />;
}
