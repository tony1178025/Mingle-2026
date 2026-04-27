import { describe, expect, it } from "vitest";
import { calculateSessionPnL } from "@/lib/services/pnl-service";
import { calculateLaborCost } from "@/lib/services/labor-cost-service";
import { calculateInventoryCOGS } from "@/lib/services/inventory-cogs-service";
import { calculateROAS } from "@/lib/services/roas-service";
import { calculateChannelPnL } from "@/lib/services/channel-pnl-service";
import { updateCustomerLTV } from "@/lib/services/ltv-service";

describe("finance services are null-safe", () => {
  it("calculates pnl even when inventory config is missing", () => {
    const result = calculateSessionPnL({
      sessionId: "s1",
      participantCount: 10
    });
    expect(result.cogs).toBe(0);
    expect(result.warnings).toContain("COGS_CONFIG_MISSING");
  });

  it("returns labor fallback/zero when shifts are missing", () => {
    const result = calculateLaborCost({
      sessionId: "s1"
    });
    expect(result.labor).toBe(0);
  });

  it("returns roas payload when ad spend is missing", () => {
    const result = calculateROAS({});
    expect(result.adSpend).toBe(0);
    expect(result.roas).toBeNull();
  });

  it("returns channel pnl safely without attributions/payments", () => {
    const result = calculateChannelPnL({
      reservations: [],
      totalCogs: 0
    });
    expect(result).toEqual({});
  });

  it("skips ltv update without contact", () => {
    expect(updateCustomerLTV(null)).toBeNull();
    expect(updateCustomerLTV("")).toBeNull();
  });

  it("invite reservation can have zero revenue with cogs", () => {
    const channels = calculateChannelPnL({
      reservations: [
        {
          id: "r1",
          source: "INVITE",
          checkedIn: true,
          noShow: false,
          paymentAmount: 0,
          refundAmount: 0,
          feeAmount: 0
        }
      ],
      totalCogs: 100
    });
    expect(channels.INVITE?.revenue ?? 0).toBe(0);
    expect(channels.INVITE?.estimatedCogs ?? 0).toBeGreaterThan(0);
  });

  it("refund is reflected in pnl", () => {
    const result = calculateSessionPnL({
      sessionId: "s2",
      participantCount: 0,
      revenue: 1000,
      refund: 200
    });
    expect(result.netRevenue).toBe(800);
  });

  it("inventory cogs prefers actual movements", () => {
    const cogs = calculateInventoryCOGS({
      sessionId: "s1",
      participantCount: 10,
      cogsPerPerson: 50,
      movements: [
        { sessionId: "s1", itemId: "beer", type: "USE", quantity: 2, unitCost: 30 }
      ]
    });
    expect(cogs.cogs).toBe(60);
    expect(cogs.source).toBe("actual");
  });
});
