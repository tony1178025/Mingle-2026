"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfilePhotoUploader } from "@/components/customer/ProfilePhotoUploader";
import {
  PROFILE_AGE_OPTIONS,
  PROFILE_APPEARANCE_KEYWORDS,
  PROFILE_GOAL_OPTIONS,
  PROFILE_IDEAL_OPTIONS,
  PROFILE_JOB_OTHER_LABEL,
  PROFILE_ENERGY_OPTIONS,
  PROFILE_JOB_OPTIONS,
  PROFILE_PERSONALITY_KEYWORDS
} from "@/features/profile/options";
import { Button } from "@/components/shared/ui";
import { triggerHaptic } from "@/lib/haptics";
import { cn, createToast } from "@/lib/mingle";
import { useMingleStore } from "@/stores/useMingleStore";
import type { EnergyType, ParticipantGender, ProfileDraft } from "@/types/mingle";

type ProfileFieldState = Pick<
  ProfileDraft,
  "nickname" | "age" | "jobCategory" | "job" | "photoUrl" | "heightCm" | "animalType" | "energyType"
>;

const TRAIT_GROUP_DELIMITER = "|";
const TRAIT_ITEM_DELIMITER = ",";
const MAX_CHIP_SELECTION = 3;

function parseTraitValue(raw: string) {
  const appearance: string[] = [];
  const personality: string[] = [];
  if (!raw.trim()) {
    return { appearance, personality };
  }

  raw.split(TRAIT_GROUP_DELIMITER).forEach((group) => {
    const [label, values] = group.split(":");
    const parsedValues = (values ?? "")
      .split(TRAIT_ITEM_DELIMITER)
      .map((item) => item.trim())
      .filter(Boolean);
    if (label === "외모") {
      appearance.push(...parsedValues);
    }
    if (label === "내적" || label === "성향") {
      personality.push(...parsedValues);
    }
  });

  return {
    appearance: Array.from(new Set(appearance)).slice(0, MAX_CHIP_SELECTION),
    personality: Array.from(new Set(personality)).slice(0, MAX_CHIP_SELECTION)
  };
}

function serializeTraitValue(appearance: string[], personality: string[]) {
  const appearancePart = `외모:${appearance.join(TRAIT_ITEM_DELIMITER)}`;
  const personalityPart = `성향:${personality.join(TRAIT_ITEM_DELIMITER)}`;
  return `${appearancePart}${TRAIT_GROUP_DELIMITER}${personalityPart}`;
}

function toggleChipWithLimit(list: string[], keyword: string, onLimitReached: () => void) {
  const active = list.includes(keyword);
  if (active) {
    return list.filter((item) => item !== keyword);
  }
  if (list.length >= MAX_CHIP_SELECTION) {
    onLimitReached();
    return list;
  }
  return [...list, keyword];
}

export function ProfileFormFields({
  value,
  testIdPrefix,
  onChange,
  profileUploadSubjectId,
  avatarGender,
  mode = "edit",
  checkinPhone = "",
  onComplete,
  completeButtonDisabled = false
}: {
  value: ProfileFieldState;
  testIdPrefix: string;
  onChange: <K extends keyof ProfileFieldState>(field: K, nextValue: ProfileFieldState[K]) => void;
  profileUploadSubjectId: string;
  avatarGender: ParticipantGender;
  mode?: "onboarding" | "edit";
  checkinPhone?: string;
  onComplete?: () => void;
  completeButtonDisabled?: boolean;
}) {
  const showMaxSelectionToast = () => {
    useMingleStore.setState({ toast: createToast("info", "최대 3개까지 선택할 수 있어요") });
  };
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState(checkinPhone);
  const [birthYear, setBirthYear] = useState("");
  const [customJob, setCustomJob] = useState("");
  const parsedTraits = useMemo(() => parseTraitValue(value.animalType), [value.animalType]);
  const [selectedAppearanceTraits, setSelectedAppearanceTraits] = useState<string[]>(parsedTraits.appearance);
  const [selectedPersonalityTraits, setSelectedPersonalityTraits] = useState<string[]>(parsedTraits.personality);
  const [selectedIdealTypes, setSelectedIdealTypes] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentPortrait, setConsentPortrait] = useState(false);
  const [maxSelectionHint, setMaxSelectionHint] = useState<string | null>(null);
  const [showValidationHint, setShowValidationHint] = useState(false);

  useEffect(() => {
    setContact(checkinPhone);
  }, [checkinPhone]);

  const jobOptions = useMemo(() => {
    if (!value.jobCategory) return [];
    const defaults = PROFILE_JOB_OPTIONS[value.jobCategory] ?? [];
    return [...defaults, PROFILE_JOB_OTHER_LABEL];
  }, [value.jobCategory]);
  const isJobCategoryOther = value.jobCategory === PROFILE_JOB_OTHER_LABEL;
  const isJobOtherSelected = value.job === PROFILE_JOB_OTHER_LABEL || isJobCategoryOther;

  useEffect(() => {
    const normalized = customJob.trim();
    if (isJobOtherSelected && value.job !== normalized) {
      onChange("job", normalized);
    }
  }, [customJob, isJobOtherSelected, onChange, value.job]);

  useEffect(() => {
    setSelectedAppearanceTraits(parsedTraits.appearance);
    setSelectedPersonalityTraits(parsedTraits.personality);
  }, [parsedTraits.appearance, parsedTraits.personality]);

  const stepTitles = ["기본 정보", "프로필", "직업", "분위기", "이상형과 동의"] as const;
  const progressLabel = `${step}/5 ${stepTitles[step - 1] ?? "기본 정보"}`;
  const currentYear = new Date().getFullYear();
  const derivedAge = birthYear.length === 4 ? currentYear - Number(birthYear) + 1 : null;
  const canGoNext =
    (step === 1 && Boolean(fullName.trim() && birthYear.trim().length === 4)) ||
    (step === 2 && Boolean(value.nickname.trim() && value.heightCm.trim())) ||
    (step === 3 && Boolean(value.jobCategory && value.job.trim())) ||
    (step === 4 &&
      Boolean(
        (selectedAppearanceTraits.length > 0 || selectedPersonalityTraits.length > 0) && value.energyType && goal
      )) ||
    (step === 5 && Boolean(selectedIdealTypes.length === MAX_CHIP_SELECTION && consentPrivacy && consentPortrait));

  const isReadyToComplete = canGoNext && step === 5;
  const showStepValidation = showValidationHint && !canGoNext;

  useEffect(() => {
    if (!derivedAge || Number.isNaN(derivedAge)) {
      return;
    }
    onChange("age", String(derivedAge));
  }, [derivedAge, onChange]);

  if (mode === "onboarding") {
    return (
      <div className="compact-stack">
        <p className="field-help onboarding-progress-text">{progressLabel}</p>

        {step === 1 ? (
          <div className="form-grid">
            <label className={cn("field", showStepValidation && !fullName.trim() && "field-invalid-shake", "floating-field")}>
              <span>이름</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder=" "
              />
            </label>
            <label className={cn("field", "floating-field")}>
              <span>연락처</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder=" "
              />
            </label>
            <label className={cn("field", showStepValidation && birthYear.trim().length !== 4 && "field-invalid-shake", "floating-field")}>
              <span>출생연도</span>
              <input
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder=" "
                inputMode="numeric"
              />
            </label>
            <label className="field">
              <span>성별</span>
              <input value={avatarGender === "M" ? "남성" : "여성"} disabled />
            </label>
            {derivedAge ? (
              <p className="field-help field-span-2">출생연도를 기준으로 현재 나이는 {derivedAge}세로 적용됩니다.</p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <ProfilePhotoUploader
              profileSubjectId={profileUploadSubjectId}
              avatarGender={avatarGender}
              value={value.photoUrl}
              onChange={(url) => onChange("photoUrl", url)}
            />
            <label className={cn("field", showStepValidation && !value.nickname.trim() && "field-invalid-shake", "floating-field")}>
              <span>닉네임</span>
              <input
                value={value.nickname}
                onChange={(event) => onChange("nickname", event.target.value)}
                maxLength={8}
                autoComplete="nickname"
                placeholder=" "
                data-testid={`${testIdPrefix}-nickname`}
              />
            </label>
            <label className={cn("field", showStepValidation && !value.heightCm.trim() && "field-invalid-shake", "floating-field")}>
              <span>키</span>
              <input
                value={value.heightCm}
                onChange={(event) => onChange("heightCm", event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={3}
                placeholder=" "
                data-testid={`${testIdPrefix}-height`}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-grid">
            <label className="field">
              <span>직업 대분류</span>
              <div className="choice-grid">
                {[...Object.keys(PROFILE_JOB_OPTIONS), PROFILE_JOB_OTHER_LABEL].map((category) => {
                  const active = value.jobCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => {
                        onChange("jobCategory", category);
                        onChange("job", "");
                        setCustomJob("");
                      }}
                    >
                      <strong>{category}</strong>
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="field">
              <span>직업 소분류</span>
              <div className="choice-grid">
                {jobOptions.map((job) => {
                  const active = (isJobOtherSelected && customJob ? PROFILE_JOB_OTHER_LABEL : value.job) === job;
                  return (
                    <button
                      key={job}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => {
                        onChange("job", job);
                        if (job !== PROFILE_JOB_OTHER_LABEL) {
                          setCustomJob("");
                        }
                      }}
                    >
                      <strong>{job}</strong>
                    </button>
                  );
                })}
              </div>
            </label>
            {isJobOtherSelected ? (
              <label className="field field-span-2">
                <span>직업을 직접 입력해주세요</span>
                <input
                  value={customJob}
                  onChange={(event) => setCustomJob(event.target.value)}
                  placeholder="직업을 직접 입력해주세요"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="compact-stack">
            <label className="field">
              <span>나를 표현하는 키워드</span>
            </label>
            <p className="field-help">외모와 성향을 선택해주세요</p>
            <p className="field-help">최대 3개까지 선택할 수 있어요</p>
            {maxSelectionHint ? <p className="field-help">{maxSelectionHint}</p> : null}

            <div className="compact-stack">
              <strong>외모 (최대 3개)</strong>
              <div className="choice-grid">
                {PROFILE_APPEARANCE_KEYWORDS.map((keyword) => {
                  const active = selectedAppearanceTraits.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => {
                        const next = toggleChipWithLimit(selectedAppearanceTraits, keyword, () => {
                          setMaxSelectionHint("최대 3개까지 선택할 수 있어요");
                          triggerHaptic("light");
                          showMaxSelectionToast();
                        });
                        if (next !== selectedAppearanceTraits) {
                          setMaxSelectionHint(null);
                        }
                        setSelectedAppearanceTraits(next);
                        onChange("animalType", serializeTraitValue(next, selectedPersonalityTraits));
                      }}
                      style={{ opacity: active ? 1 : 0.88, transform: active ? "scale(1.04)" : "scale(1)" }}
                    >
                      <strong>{keyword}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="compact-stack">
              <strong>성향 (최대 3개)</strong>
              <div className="choice-grid">
                {PROFILE_PERSONALITY_KEYWORDS.map((keyword) => {
                  const active = selectedPersonalityTraits.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => {
                        const next = toggleChipWithLimit(selectedPersonalityTraits, keyword, () => {
                          setMaxSelectionHint("최대 3개까지 선택할 수 있어요");
                          triggerHaptic("light");
                          showMaxSelectionToast();
                        });
                        if (next !== selectedPersonalityTraits) {
                          setMaxSelectionHint(null);
                        }
                        setSelectedPersonalityTraits(next);
                        onChange("animalType", serializeTraitValue(selectedAppearanceTraits, next));
                      }}
                      style={{ opacity: active ? 1 : 0.88, transform: active ? "scale(1.04)" : "scale(1)" }}
                    >
                      <strong>{keyword}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="field field-span-2">
              <span>MBTI I / E</span>
              <div className="segmented segmented-compact">
                {PROFILE_ENERGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      value.energyType === option.id ? "segmented-item segmented-item-active" : "segmented-item"
                    }
                    onClick={() => onChange("energyType", option.id as EnergyType)}
                    data-testid={`${testIdPrefix}-energy-${option.id.toLowerCase()}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field field-span-2">
              <span>오늘 목표</span>
              <div className="choice-grid">
                {PROFILE_GOAL_OPTIONS.map((option) => {
                  const active = goal === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => setGoal(option)}
                    >
                      <strong>{option}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="form-grid">
            <div className="field field-span-2">
              <span>선호하는 스타일을 선택해주세요</span>
              <p className="field-help">선택한 순서대로 우선순위가 정해집니다</p>
              {maxSelectionHint ? <p className="field-help">{maxSelectionHint}</p> : null}
              <div className="choice-grid">
                {PROFILE_IDEAL_OPTIONS.map((option) => {
                  const order = selectedIdealTypes.indexOf(option);
                  const active = order >= 0;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={active ? "choice-card choice-card-active" : "choice-card"}
                      onClick={() => {
                        if (active) {
                          setSelectedIdealTypes((current) => current.filter((item) => item !== option));
                          setMaxSelectionHint(null);
                          return;
                        }
                        if (selectedIdealTypes.length >= MAX_CHIP_SELECTION) {
                          setMaxSelectionHint("최대 3개까지 선택할 수 있어요");
                          triggerHaptic("light");
                          showMaxSelectionToast();
                          return;
                        }
                        setSelectedIdealTypes((current) => [...current, option]);
                        setMaxSelectionHint(null);
                      }}
                      style={{ opacity: active ? 1 : 0.88, transform: active ? "scale(1.04)" : "scale(1)" }}
                    >
                      <strong>{active ? `${order + 1}순위 · ${option}` : option}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="compact-row field-span-2">
              <strong>개인정보 수집 동의</strong>
              <input
                type="checkbox"
                checked={consentPrivacy}
                onChange={(event) => setConsentPrivacy(event.target.checked)}
              />
            </label>
            <label className="compact-row field-span-2">
              <strong>사진촬영/초상권 동의</strong>
              <input
                type="checkbox"
                checked={consentPortrait}
                onChange={(event) => setConsentPortrait(event.target.checked)}
              />
            </label>
            <div className="field-span-2">
              <Button block disabled={!isReadyToComplete || completeButtonDisabled} onClick={() => onComplete?.()}>
                입장하기
              </Button>
            </div>
          </div>
        ) : null}

        <div className="button-row onboarding-sticky-actions">
          <Button variant="ghost" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            이전
          </Button>
          {step < 5 ? (
            <Button
              onClick={() => {
                triggerHaptic("light");
                if (!canGoNext) {
                  setShowValidationHint(true);
                  return;
                }
                setShowValidationHint(false);
                setStep((current) => Math.min(5, current + 1));
              }}
              disabled={false}
            >
              다음
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <label className="field">
        <span>닉네임</span>
        <input
          value={value.nickname}
          onChange={(event) => onChange("nickname", event.target.value)}
          maxLength={8}
          autoComplete="nickname"
          placeholder="테이블에서 불릴 이름"
          data-testid={`${testIdPrefix}-nickname`}
        />
      </label>

      <label className="field">
        <span>나이</span>
        <select
          value={value.age}
          onChange={(event) => onChange("age", event.target.value)}
          data-testid={`${testIdPrefix}-age`}
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
        <span>직군</span>
        <select
          value={value.jobCategory}
          onChange={(event) => {
            onChange("jobCategory", event.target.value);
            onChange("job", "");
          }}
          data-testid={`${testIdPrefix}-job-category`}
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
          value={value.job}
          onChange={(event) => onChange("job", event.target.value)}
          data-testid={`${testIdPrefix}-job`}
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
          value={value.heightCm}
          onChange={(event) => onChange("heightCm", event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={3}
          placeholder="예: 170"
          data-testid={`${testIdPrefix}-height`}
        />
      </label>

      <div className="field field-span-2">
        <span>나를 표현하는 키워드</span>
        <p className="field-help">외모와 성향을 선택해주세요</p>
        <p className="field-help">최대 3개까지 선택할 수 있어요</p>
        {maxSelectionHint ? <p className="field-help">{maxSelectionHint}</p> : null}
        <div className="compact-stack">
          <strong>외모 (최대 3개)</strong>
          <div className="choice-grid">
            {PROFILE_APPEARANCE_KEYWORDS.map((keyword) => {
              const active = selectedAppearanceTraits.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  className={active ? "choice-card choice-card-active" : "choice-card"}
                  onClick={() => {
                    const next = toggleChipWithLimit(selectedAppearanceTraits, keyword, () => {
                      setMaxSelectionHint("최대 3개까지 선택할 수 있어요");
                    });
                    if (next !== selectedAppearanceTraits) {
                      setMaxSelectionHint(null);
                    }
                    setSelectedAppearanceTraits(next);
                    onChange("animalType", serializeTraitValue(next, selectedPersonalityTraits));
                  }}
                  data-testid={`${testIdPrefix}-appearance-${keyword}`}
                  style={{ opacity: active ? 1 : 0.88, transform: active ? "scale(0.98)" : "scale(1)" }}
                >
                  <strong>{keyword}</strong>
                </button>
              );
            })}
          </div>
        </div>
        <div className="compact-stack">
          <strong>성향 (최대 3개)</strong>
          <div className="choice-grid">
            {PROFILE_PERSONALITY_KEYWORDS.map((keyword) => {
              const active = selectedPersonalityTraits.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  className={active ? "choice-card choice-card-active" : "choice-card"}
                  onClick={() => {
                    const next = toggleChipWithLimit(selectedPersonalityTraits, keyword, () => {
                      setMaxSelectionHint("최대 3개까지 선택할 수 있어요");
                    });
                    if (next !== selectedPersonalityTraits) {
                      setMaxSelectionHint(null);
                    }
                    setSelectedPersonalityTraits(next);
                    onChange("animalType", serializeTraitValue(selectedAppearanceTraits, next));
                  }}
                  data-testid={`${testIdPrefix}-personality-${keyword}`}
                  style={{ opacity: active ? 1 : 0.88, transform: active ? "scale(0.98)" : "scale(1)" }}
                >
                  <strong>{keyword}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="field field-span-2">
        <span>E / I</span>
        <div className="segmented segmented-compact">
          {PROFILE_ENERGY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={value.energyType === option.id ? "segmented-item segmented-item-active" : "segmented-item"}
              onClick={() => onChange("energyType", option.id as EnergyType)}
              data-testid={`${testIdPrefix}-energy-${option.id.toLowerCase()}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ProfilePhotoUploader
        profileSubjectId={profileUploadSubjectId}
        avatarGender={avatarGender}
        value={value.photoUrl}
        onChange={(url) => onChange("photoUrl", url)}
      />
    </div>
  );
}
