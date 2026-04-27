import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import { computeRotation } from "@/server/rotation/rotation-engine";
import type { SessionSnapshot } from "@/types/mingle";
import type { RotationComputeOutput } from "@/server/rotation/rotation.types";

const ROTATION_TIMEOUT_MS = 100;

export async function runRotationPreview(snapshot: SessionSnapshot): Promise<RotationComputeOutput> {
  const workerFile = resolve(process.cwd(), "server/rotation/rotation.worker.ts");
  try {
    const result = await runWorker(workerFile, snapshot);
    return result;
  } catch {
    const fallback = computeRotation({
      snapshot,
      nowIso: new Date().toISOString()
    });
    return {
      ...fallback,
      fallbackUsed: true,
      warnings: [...fallback.warnings, "worker-timeout-fallback"]
    };
  }
}

function runWorker(workerFile: string, snapshot: SessionSnapshot): Promise<RotationComputeOutput> {
  return new Promise((resolvePromise, reject) => {
    const worker = new Worker(workerFile, {
      execArgv: process.execArgv
    });
    const timer = setTimeout(() => {
      worker.terminate().finally(() => reject(new Error("rotation worker timeout")));
    }, ROTATION_TIMEOUT_MS);
    worker.on("message", (message: { ok: boolean; result?: RotationComputeOutput; error?: string }) => {
      clearTimeout(timer);
      worker.terminate().finally(() => {
        if (!message.ok || !message.result) {
          reject(new Error(message.error ?? "rotation worker failed"));
          return;
        }
        resolvePromise(message.result);
      });
    });
    worker.on("error", (error) => {
      clearTimeout(timer);
      worker.terminate().finally(() => reject(error));
    });
    worker.postMessage({
      snapshot,
      nowIso: new Date().toISOString()
    });
  });
}
