export type InventoryMovement = {
  sessionId?: string | null;
  itemId: string;
  type: "IN" | "USE" | "WASTE" | "ADJUST" | "COUNT";
  quantity: number;
  unitCost: number;
};

export type InventoryUsageRule = {
  itemId: string;
  usagePerParticipant: number;
};

export type InventoryCogsInput = {
  sessionId: string;
  participantCount: number;
  movements?: InventoryMovement[];
  usageRules?: InventoryUsageRule[];
  itemUnitCostById?: Record<string, number>;
  cogsPerPerson?: number | null;
};

export function calculateInventoryCOGS(input: InventoryCogsInput) {
  const movements = (input.movements ?? []).filter(
    (item) => item.sessionId === input.sessionId && (item.type === "USE" || item.type === "WASTE")
  );
  if (movements.length > 0) {
    return {
      cogs: movements.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitCost), 0),
      source: "actual" as const,
      warnings: [] as string[]
    };
  }

  const usageRules = input.usageRules ?? [];
  if (usageRules.length > 0) {
    const cogs = usageRules.reduce((sum, rule) => {
      const unitCost = input.itemUnitCostById?.[rule.itemId] ?? 0;
      return sum + Math.max(0, input.participantCount) * Math.max(0, rule.usagePerParticipant) * Math.max(0, unitCost);
    }, 0);
    return {
      cogs,
      source: "rule" as const,
      warnings: cogs === 0 ? (["INVENTORY_DATA_EMPTY"] as string[]) : ([] as string[])
    };
  }

  if (typeof input.cogsPerPerson === "number") {
    return {
      cogs: Math.max(0, input.participantCount) * Math.max(0, input.cogsPerPerson),
      source: "fallback" as const,
      warnings: ["INVENTORY_DATA_EMPTY"] as string[]
    };
  }

  return {
    cogs: 0,
    source: "none" as const,
    warnings: ["COGS_CONFIG_MISSING"] as string[]
  };
}
