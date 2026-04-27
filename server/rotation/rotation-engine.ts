import { generateRotationPreview } from "@/engine/rotation";
import { canGenerateRotation } from "@/server/rotation/rotation-cost";
import type { RotationComputeInput, RotationComputeOutput } from "@/server/rotation/rotation.types";

export function computeRotation(input: RotationComputeInput): RotationComputeOutput {
  const started = Date.now();
  if (!canGenerateRotation(input.snapshot)) {
    throw new Error("현재 라운드에서는 추가 로테이션을 생성할 수 없습니다.");
  }
  const preview = generateRotationPreview(input.snapshot);
  return {
    preview,
    warnings: [],
    elapsedMs: Date.now() - started,
    fallbackUsed: false
  };
}
