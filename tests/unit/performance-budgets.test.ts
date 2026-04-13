import { describe, expect, it } from "vitest";
import {
  classifyWebVital,
  formatWebVitalValue,
  getWebVitalHint
} from "@/lib/performance/budgets";

describe("performance budgets", () => {
  it("classifies INP against premium interaction thresholds", () => {
    expect(classifyWebVital("INP", 180)).toBe("good");
    expect(classifyWebVital("INP", 320)).toBe("needs-improvement");
    expect(classifyWebVital("INP", 640)).toBe("poor");
  });

  it("formats score based vitals differently from millisecond metrics", () => {
    expect(formatWebVitalValue("CLS", 0.0843)).toBe("0.084");
    expect(formatWebVitalValue("LCP", 2612.4)).toBe("2612ms");
  });

  it("returns an actionable hint for degraded vitals", () => {
    expect(getWebVitalHint("TTFB", "poor")).toContain("TTFB");
    expect(getWebVitalHint("CLS", "needs-improvement")).toContain("레이아웃");
  });
});
