import { buildActiveContentView, isContentEligibleForPhase } from "@/features/content/library";
import { createAuditLog } from "@/lib/mingle";

describe("alignment rules", () => {
  it("supports phase-based content activation without hardcoding in UI", () => {
    expect(isContentEligibleForPhase("round1-only", "ROUND_1")).toBe(true);
    expect(isContentEligibleForPhase("round1-only", "ROUND_2")).toBe(false);
    expect(isContentEligibleForPhase("round2-only", "ROUND_2")).toBe(true);
    expect(isContentEligibleForPhase("round2-only", "ROUND_1")).toBe(false);

    const rows = buildActiveContentView(["question-cards", "balance-pick"], "ROUND_1");
    const question = rows.find((item) => item.id === "question-cards");
    const balance = rows.find((item) => item.id === "balance-pick");
    expect(question?.isAdminActivated).toBe(true);
    expect(question?.isPhaseEligible).toBe(true);
    expect(balance?.isAdminActivated).toBe(true);
    expect(balance?.isPhaseEligible).toBe(false);
  });

  it("writes audit logs to the target session id", () => {
    const audit = createAuditLog(
      "PHASE_CHANGED",
      "admin",
      "ADMIN",
      "phase changed",
      { phase: "ROUND_2" },
      "session_test_001"
    );
    expect(audit.sessionId).toBe("session_test_001");
  });
});

