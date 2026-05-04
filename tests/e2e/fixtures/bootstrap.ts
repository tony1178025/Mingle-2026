import { readFileSync } from "node:fs";
import path from "node:path";

export type E2eBootstrapState = {
  ok: true;
  branchId: string;
  sessionId: string;
  phase: "CHECKIN" | "ROUND_1" | "BREAK" | "ROUND_2" | "MATCH_END" | "CLOSED";
  lifecycleStatus: "DRAFT" | "OPEN" | "CLOSED" | "DISABLED";
  admin: {
    email: string;
    password: string;
    cookieValue: string;
  };
  tables: Array<{
    id: number;
    label: string;
    qrStatus: "ACTIVE" | "REVOKED";
  }>;
  qrUrls: {
    tableA: string;
    tableB: string;
    revokedTableA: string;
    regeneratedTableA: string;
  };
  participants: {
    round1Target: string | null;
    round1TargetNickname: string | null;
    round2Target: string | null;
    round2TargetNickname: string | null;
    round2TargetTableId?: number;
    reportTarget: string | null;
  };
  onboardingProfile: {
    nickname: string;
    age: string;
    jobCategory: string;
    job: string;
    heightCm: string;
    animalType: string;
    energyType: "E" | "I";
  };
  metadata: {
    seedVersion: number;
    source: string;
    branchName: string;
  };
};

const BOOTSTRAP_STATE_PATH = path.join(process.cwd(), "tests/e2e/.state/e2e-seed.json");

let cachedState: E2eBootstrapState | null = null;

export function getE2eBootstrapState(): E2eBootstrapState {
  if (cachedState) {
    return cachedState;
  }
  const raw = readFileSync(BOOTSTRAP_STATE_PATH, "utf8");
  const parsed = JSON.parse(raw) as E2eBootstrapState;
  if (!parsed?.ok) {
    throw new Error("E2E bootstrap state file is missing required payload.");
  }
  cachedState = parsed;
  return parsed;
}

