import { ANIMAL_TYPES, JOB_OPTIONS } from "@/lib/mingle";

export const PROFILE_AGE_OPTIONS = Array.from({ length: 21 }, (_, index) => index + 20);
export const PROFILE_JOB_OPTIONS = JOB_OPTIONS;
export const PROFILE_ANIMAL_OPTIONS = ANIMAL_TYPES;
export const PROFILE_ENERGY_OPTIONS = [
  { id: "E", label: "E", description: "먼저 말을 걸고 에너지를 바깥으로 쓰는 편" },
  { id: "I", label: "I", description: "차분하게 분위기를 읽고 깊게 연결되는 편" }
] as const;
