import type { RotationPreview, SessionSnapshot } from "@/types/mingle";

export type RotationComputeInput = {
  snapshot: SessionSnapshot;
  nowIso: string;
};

export type RotationComputeOutput = {
  preview: RotationPreview;
  warnings: string[];
  elapsedMs: number;
  fallbackUsed: boolean;
};
