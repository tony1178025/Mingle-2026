export type AdSpend = {
  campaignId?: string | null;
  branchId?: string | null;
  spendDate: string;
  amount: number;
};

export type ReservationAttribution = {
  reservationId: string;
  campaignId?: string | null;
  branchId?: string | null;
};

export type PaymentRecord = {
  reservationId: string;
  amount: number;
};

export type RoasInput = {
  branchId?: string | null;
  from?: string | null;
  to?: string | null;
  adSpend?: AdSpend[];
  attributions?: ReservationAttribution[];
  payments?: PaymentRecord[];
};

function inRange(date: string, from?: string | null, to?: string | null) {
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return false;
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

export function calculateROAS(input: RoasInput) {
  const spend = (input.adSpend ?? [])
    .filter((row) => !input.branchId || !row.branchId || row.branchId === input.branchId)
    .filter((row) => inRange(row.spendDate, input.from, input.to))
    .reduce((sum, row) => sum + Math.max(0, row.amount), 0);

  const attributedReservationIds = new Set(
    (input.attributions ?? [])
      .filter((row) => !input.branchId || !row.branchId || row.branchId === input.branchId)
      .map((row) => row.reservationId)
  );
  const attributedRevenue = (input.payments ?? [])
    .filter((payment) => attributedReservationIds.has(payment.reservationId))
    .reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
  return {
    adSpend: spend,
    attributedRevenue,
    roas: spend > 0 ? attributedRevenue / spend : null,
    reservations: attributedReservationIds.size
  };
}
