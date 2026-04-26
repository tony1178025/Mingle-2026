import { JOB_OPTIONS } from "@/lib/mingle";

export const PROFILE_AGE_OPTIONS = Array.from({ length: 21 }, (_, index) => index + 20);
export const PROFILE_JOB_OPTIONS = JOB_OPTIONS;
export const PROFILE_JOB_OTHER_LABEL = "기타";
export const PROFILE_APPEARANCE_KEYWORDS = [
  "강아지상",
  "고양이상",
  "토끼상",
  "여우상",
  "곰상",
  "두부상",
  "아랍상",
  "배우상",
  "아이돌상",
  "훈훈한 인상",
  "차가운 인상",
  "귀여운 인상",
  "섹시한 인상",
  "청순한 인상",
  "성숙한 인상"
] as const;
export const PROFILE_PERSONALITY_KEYWORDS = [
  "유머 있는",
  "말 잘하는",
  "조용한",
  "차분한",
  "활발한",
  "리더형",
  "배려하는",
  "솔직한",
  "감성적인",
  "현실적인",
  "계획적인",
  "자유로운"
] as const;
export const PROFILE_GOAL_OPTIONS = [
  "편하게 대화하고 싶어요",
  "좋은 인연을 만나고 싶어요",
  "새로운 친구를 만나고 싶어요"
] as const;
export const PROFILE_IDEAL_OPTIONS = [
  "대화가 편한 사람",
  "유머가 맞는 사람",
  "배려심 있는 사람",
  "에너지가 비슷한 사람",
  "취향이 비슷한 사람",
  "분위기가 따뜻한 사람"
] as const;
export const PROFILE_ENERGY_OPTIONS = [
  { id: "E", label: "E", description: "먼저 말을 걸고 에너지를 바깥으로 쓰는 편" },
  { id: "I", label: "I", description: "차분하게 분위기를 읽고 깊게 연결되는 편" }
] as const;
