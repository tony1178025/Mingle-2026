"use client";

import { ProfilePhotoUploader } from "@/components/customer/ProfilePhotoUploader";
import {
  PROFILE_AGE_OPTIONS,
  PROFILE_ANIMAL_OPTIONS,
  PROFILE_ENERGY_OPTIONS,
  PROFILE_JOB_OPTIONS
} from "@/features/profile/options";
import type { EnergyType, ProfileDraft } from "@/types/mingle";

type ProfileFieldState = Pick<
  ProfileDraft,
  "nickname" | "age" | "jobCategory" | "job" | "photoUrl" | "heightCm" | "animalType" | "energyType"
>;

export function ProfileFormFields({
  value,
  testIdPrefix,
  onChange
}: {
  value: ProfileFieldState;
  testIdPrefix: string;
  onChange: <K extends keyof ProfileFieldState>(field: K, nextValue: ProfileFieldState[K]) => void;
}) {
  const jobOptions = value.jobCategory ? PROFILE_JOB_OPTIONS[value.jobCategory] ?? [] : [];

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

      <label className="field">
        <span>동물 타입</span>
        <select
          value={value.animalType}
          onChange={(event) => onChange("animalType", event.target.value)}
          data-testid={`${testIdPrefix}-animal`}
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

      <ProfilePhotoUploader value={value.photoUrl} onChange={(url) => onChange("photoUrl", url)} />
    </div>
  );
}
