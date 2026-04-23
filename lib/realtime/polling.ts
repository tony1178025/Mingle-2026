import { MINGLE_CONSTANTS } from "@/lib/mingle";

export interface SessionTransport {
  start(sync: () => Promise<void> | void): () => void;
}

export function createPollingTransport(intervalMs = MINGLE_CONSTANTS.pollingIntervalMs): SessionTransport {
  return {
    start(sync) {
      const timer = window.setInterval(() => {
        void sync();
      }, intervalMs);

      return () => window.clearInterval(timer);
    }
  };
}

export function startSessionPolling(
  sync: () => Promise<void> | void,
  intervalMs = MINGLE_CONSTANTS.pollingIntervalMs
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  return createPollingTransport(intervalMs).start(sync);
}
