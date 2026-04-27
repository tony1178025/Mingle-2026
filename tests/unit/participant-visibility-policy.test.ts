import { describe, expect, it } from "vitest";
import { serializeParticipantForCustomer } from "@/lib/policies/participant-visibility-policy";
import { createSeedSnapshot } from "@/lib/mingle";

describe("participant visibility policy", () => {
  it("hides age and job in ROUND_1", () => {
    const snapshot = createSeedSnapshot();
    const serialized = serializeParticipantForCustomer(snapshot.participants[0]!, "ROUND_1");
    expect(serialized.age).toBeUndefined();
    expect(serialized.job).toBeUndefined();
    expect(serialized.tableLabel).toBeTruthy();
  });

  it("exposes age and job in ROUND_2", () => {
    const snapshot = createSeedSnapshot();
    const serialized = serializeParticipantForCustomer(snapshot.participants[0]!, "ROUND_2");
    expect(typeof serialized.age).toBe("number");
    expect(typeof serialized.job).toBe("string");
    expect(serialized.tableLabel).toBeUndefined();
  });
});
