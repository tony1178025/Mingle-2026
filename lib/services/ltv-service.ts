export type CustomerLtvRecord = {
  normalizedContact: string;
  totalRevenue: number;
  totalProfitEstimate: number;
  visitCount: number;
  noShowCount: number;
  refundCount: number;
};

export function normalizeContact(contact: string) {
  return contact.replace(/\D/g, "").trim();
}

export function updateCustomerLTV(
  contact: string | null | undefined,
  current?: CustomerLtvRecord | null
) {
  const normalized = normalizeContact(contact ?? "");
  if (!normalized) {
    return null;
  }
  return {
    normalizedContact: normalized,
    totalRevenue: Math.max(0, current?.totalRevenue ?? 0),
    totalProfitEstimate: Math.max(0, current?.totalProfitEstimate ?? 0),
    visitCount: Math.max(0, current?.visitCount ?? 0),
    noShowCount: Math.max(0, current?.noShowCount ?? 0),
    refundCount: Math.max(0, current?.refundCount ?? 0)
  } satisfies CustomerLtvRecord;
}

export function calculateLTV(records?: CustomerLtvRecord[]) {
  const safe = records ?? [];
  const totals = safe.reduce(
    (acc, row) => ({
      customers: acc.customers + 1,
      revenue: acc.revenue + Math.max(0, row.totalRevenue),
      profit: acc.profit + Math.max(0, row.totalProfitEstimate),
      visits: acc.visits + Math.max(0, row.visitCount)
    }),
    { customers: 0, revenue: 0, profit: 0, visits: 0 }
  );
  return {
    customers: totals.customers,
    averageRevenuePerCustomer: totals.customers > 0 ? totals.revenue / totals.customers : 0,
    averageProfitPerCustomer: totals.customers > 0 ? totals.profit / totals.customers : 0,
    averageVisitCount: totals.customers > 0 ? totals.visits / totals.customers : 0
  };
}
