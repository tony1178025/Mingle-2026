export type ReservationSource = "NAVER" | "INTERNAL" | "WALK_IN" | "INVITE" | "PROMO";

export type ChannelReservation = {
  id: string;
  source: ReservationSource;
  checkedIn: boolean;
  noShow: boolean;
  paymentAmount?: number;
  refundAmount?: number;
  feeAmount?: number;
};

export type ChannelPnlInput = {
  reservations?: ChannelReservation[];
  totalCogs?: number;
};

export function calculateChannelPnL(input: ChannelPnlInput) {
  const reservations = input.reservations ?? [];
  const checkedInTotal = reservations.filter((item) => item.checkedIn).length;
  const cogsPerCheckedIn = checkedInTotal > 0 ? Math.max(0, input.totalCogs ?? 0) / checkedInTotal : 0;
  const grouped = new Map<
    ReservationSource,
    {
      reservations: number;
      checkedIn: number;
      noShow: number;
      revenue: number;
      refund: number;
      fee: number;
      estimatedCogs: number;
      estimatedProfit: number;
    }
  >();
  for (const row of reservations) {
    const current = grouped.get(row.source) ?? {
      reservations: 0,
      checkedIn: 0,
      noShow: 0,
      revenue: 0,
      refund: 0,
      fee: 0,
      estimatedCogs: 0,
      estimatedProfit: 0
    };
    current.reservations += 1;
    current.checkedIn += row.checkedIn ? 1 : 0;
    current.noShow += row.noShow ? 1 : 0;
    current.revenue += Math.max(0, row.paymentAmount ?? 0);
    current.refund += Math.max(0, row.refundAmount ?? 0);
    current.fee += Math.max(0, row.feeAmount ?? 0);
    current.estimatedCogs += row.checkedIn ? cogsPerCheckedIn : 0;
    current.estimatedProfit = current.revenue - current.refund - current.fee - current.estimatedCogs;
    grouped.set(row.source, current);
  }
  return Object.fromEntries(grouped.entries());
}
