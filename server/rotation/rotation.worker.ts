import { parentPort } from "node:worker_threads";
import { computeRotation } from "@/server/rotation/rotation-engine";
import type { RotationComputeInput, RotationComputeOutput } from "@/server/rotation/rotation.types";

if (parentPort) {
  parentPort.on("message", (payload: RotationComputeInput) => {
    try {
      const result = computeRotation(payload);
      parentPort?.postMessage({ ok: true, result } satisfies { ok: true; result: RotationComputeOutput });
    } catch (error) {
      parentPort?.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : "rotation worker failed"
      });
    }
  });
}
