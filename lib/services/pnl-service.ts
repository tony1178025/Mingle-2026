import { calculateInventoryCOGS, type InventoryCogsInput } from "@/lib/services/inventory-cogs-service";
import { calculateLaborCost, type LaborCostInput } from "@/lib/services/labor-cost-service";

export type SessionPnlInput = {
  sessionId: string;
  participantCount: number;
  revenue?: number;
  refund?: number;
  fee?: number;
  fixed?: number;
  other?: number;
  marketingCost?: number;
  inventory?: Omit<InventoryCogsInput, "sessionId" | "participantCount"> & { cogsPerPerson?: number | null };
  labor?: Omit<LaborCostInput, "sessionId">;
};

export function calculateSessionPnL(input: SessionPnlInput) {
  const revenue = Math.max(0, input.revenue ?? 0);
  const refund = Math.max(0, input.refund ?? 0);
  const fee = Math.max(0, input.fee ?? 0);
  const netRevenue = revenue - refund;
  const cogsResult = calculateInventoryCOGS({
    sessionId: input.sessionId,
    participantCount: input.participantCount,
    movements: input.inventory?.movements,
    usageRules: input.inventory?.usageRules,
    itemUnitCostById: input.inventory?.itemUnitCostById,
    cogsPerPerson: input.inventory?.cogsPerPerson
  });
  const laborResult = calculateLaborCost({
    sessionId: input.sessionId,
    shifts: input.labor?.shifts,
    laborCosts: input.labor?.laborCosts,
    laborPerSession: input.labor?.laborPerSession,
    sessionEndAt: input.labor?.sessionEndAt
  });
  const fixed = Math.max(0, input.fixed ?? 0);
  const other = Math.max(0, input.other ?? 0);
  const marketingCost = Math.max(0, input.marketingCost ?? 0);
  const profit = netRevenue - fee - cogsResult.cogs - laborResult.labor - fixed - other - marketingCost;
  return {
    revenue,
    refund,
    fee,
    netRevenue,
    cogs: cogsResult.cogs,
    labor: laborResult.labor,
    fixed,
    other,
    marketingCost,
    profit,
    warnings: [...cogsResult.warnings, ...laborResult.warnings]
  };
}
