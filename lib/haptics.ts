export type HapticKind = "light" | "success" | "error" | "medium";

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  success: [12, 24, 12],
  error: [24, 40, 24],
  medium: 28
};

export function triggerHaptic(kind: HapticKind) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate(HAPTIC_PATTERNS[kind]);
}

