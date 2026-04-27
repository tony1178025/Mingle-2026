export type StaffShift = {
  sessionId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  hourlyRateSnapshot?: number | null;
  fixedAmount?: number | null;
};

export type LaborCostEntry = {
  sessionId?: string | null;
  amount: number;
};

export type LaborCostInput = {
  sessionId: string;
  shifts?: StaffShift[];
  laborCosts?: LaborCostEntry[];
  laborPerSession?: number | null;
  sessionEndAt?: string | null;
};

function safeHours(startedAt: string, endedAt?: string | null) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

export function calculateLaborCost(input: LaborCostInput) {
  const shifts = (input.shifts ?? []).filter((item) => item.sessionId === input.sessionId);
  const laborEntries = (input.laborCosts ?? []).filter((item) => item.sessionId === input.sessionId);
  const shiftCost = shifts.reduce((sum, shift) => {
    const endedAt = shift.endedAt ?? input.sessionEndAt ?? null;
    return (
      sum +
      safeHours(shift.startedAt, endedAt) * Math.max(0, shift.hourlyRateSnapshot ?? 0) +
      Math.max(0, shift.fixedAmount ?? 0)
    );
  }, 0);
  const manualCost = laborEntries.reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const total = shiftCost + manualCost;
  if (total > 0) {
    return { labor: total, source: "actual" as const, warnings: [] as string[] };
  }
  if (typeof input.laborPerSession === "number") {
    return {
      labor: Math.max(0, input.laborPerSession),
      source: "fallback" as const,
      warnings: ["LABOR_DATA_EMPTY"] as string[]
    };
  }
  return { labor: 0, source: "none" as const, warnings: ["LABOR_DATA_EMPTY"] as string[] };
}
