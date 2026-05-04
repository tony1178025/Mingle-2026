import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { createInMemoryAdminUserStore, hashAdminPassword } from "@/lib/admin-user-store";
import { setAdminUserStoreForTests } from "@/lib/admin-user-store";

const E2E_STATE_DIR = path.join(process.cwd(), "tests", "e2e", ".state");
const E2E_SEED_FILE = path.join(E2E_STATE_DIR, "e2e-seed.json");

type BootstrapResponse = {
  ok: true;
  branchId: string;
  sessionId: string;
  phase: "CHECKIN" | "ROUND_1" | "BREAK" | "ROUND_2" | "MATCH_END" | "CLOSED";
  lifecycleStatus: "DRAFT" | "OPEN" | "CLOSED" | "DISABLED";
  admin: {
    email: string;
    password: string;
  };
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
    reportTarget: string | null;
  };
  tables: Array<{
    id: number;
    label: string;
    qrStatus: "ACTIVE" | "REVOKED";
  }>;
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

function resolveBaseUrl(config: FullConfig) {
  const configured = config.projects[0]?.use?.baseURL;
  if (typeof configured === "string" && configured.trim()) {
    return configured;
  }
  return process.env.E2E_BASE_URL || "http://localhost:3000";
}

export default async function globalSetup(config: FullConfig) {
  if (process.env.E2E_SEED_ENABLED !== "true") {
    throw new Error(
      "E2E deterministic seed가 비활성화되어 있습니다. E2E_SEED_ENABLED=true 환경에서 실행하세요."
    );
  }

  const baseUrl = resolveBaseUrl(config);
  const response = await fetch(`${baseUrl}/api/test/e2e/bootstrap`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `E2E bootstrap 호출 실패 (${response.status}): ${body || "응답 본문 없음"}`
    );
  }

  const payload = (await response.json()) as BootstrapResponse;
  if (!payload.ok || !payload.sessionId || !payload.qrUrls?.tableA || payload.lifecycleStatus !== "OPEN") {
    throw new Error("E2E bootstrap 응답이 불완전합니다.");
  }

  await mkdir(E2E_STATE_DIR, { recursive: true });
  await writeFile(
    E2E_SEED_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        ...payload
      },
      null,
      2
    ),
    "utf8"
  );

  // Ensure Node-side test runtime (API handlers) shares deterministic admin store.
  setAdminUserStoreForTests(
    createInMemoryAdminUserStore({
      users: [
        {
          id: "e2e_admin",
          email: payload.admin.email,
          passwordHash: hashAdminPassword(payload.admin.password),
          role: "BRANCH_ADMIN",
          branchId: payload.branchId,
          isActive: true,
          displayName: "E2E Branch Admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null,
          updatedBy: "e2e-global-setup"
        }
      ]
    })
  );
}
