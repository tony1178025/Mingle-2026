type AuthorityLogLevel = "info" | "warn" | "error";

type RollingCounter = {
  count: number;
  startedAt: number;
};

const rollingCounters = new Map<string, RollingCounter>();

function writeAuthorityLog(level: AuthorityLogLevel, event: string, payload: Record<string, unknown>) {
  const logger =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(`[mingle-authority][${event}] ${JSON.stringify(payload)}`);
}

function incrementRollingCounter(
  category: string,
  key: string,
  windowMs: number
) {
  const mapKey = `${category}:${key}`;
  const now = Date.now();
  const existing = rollingCounters.get(mapKey);

  if (!existing || now - existing.startedAt > windowMs) {
    rollingCounters.set(mapKey, {
      count: 1,
      startedAt: now
    });
    return 1;
  }

  const next = {
    count: existing.count + 1,
    startedAt: existing.startedAt
  };
  rollingCounters.set(mapKey, next);
  return next.count;
}

export function logAuthorityMismatch(payload: Record<string, unknown>) {
  writeAuthorityLog("error", "authority-mismatch", payload);
}

export function logAuthorityFallback(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "authority-fallback", payload);
}

export function logSessionRevocation(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "customer-session-revoked", payload);
}

export function logInvalidSessionAttempt(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "invalid-customer-session", payload);

  const actor = String(payload.actor ?? "unknown");
  const reason = String(payload.reason ?? "unknown");
  const count = incrementRollingCounter(
    "invalid-session",
    `${actor}:${reason}:${String(payload.participantId ?? "anonymous")}`,
    5 * 60 * 1000
  );

  if (count >= 3) {
    writeAuthorityLog("warn", "repeated-failure-pattern", {
      ...payload,
      count
    });
  }
}

export function logBackfillResult(payload: Record<string, unknown>) {
  writeAuthorityLog("info", "authority-backfill", payload);
}

export function logHighFrequencyAction(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "high-frequency-action", payload);
}

export function logRepeatedFailure(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "repeated-failure", payload);
}

export function logSuspiciousPattern(payload: Record<string, unknown>) {
  writeAuthorityLog("warn", "suspicious-pattern", payload);
}
