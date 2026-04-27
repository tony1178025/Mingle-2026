export type MgVariant = {
  onboardingSteps: 5;
  photoOptional: true;
  showSwipe: boolean;
  buttonText: "다음" | "계속";
};

export function getVariant(): MgVariant {
  if (typeof window === "undefined") {
    return { onboardingSteps: 5, photoOptional: true, showSwipe: true, buttonText: "다음" };
  }
  const bucket = window.localStorage.getItem("mg-variant-bucket") ?? "A";
  return {
    onboardingSteps: 5,
    photoOptional: true,
    showSwipe: bucket !== "B",
    buttonText: bucket === "B" ? "계속" : "다음"
  };
}
