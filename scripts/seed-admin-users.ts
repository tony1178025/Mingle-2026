import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { hashAdminPassword } from "../lib/admin-user-store.ts";
import type { AdminRole } from "../types/mingle.ts";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

type SeedAdminUserInput = {
  id?: string;
  email?: string | null;
  password: string;
  role: AdminRole;
  branchId?: string | null;
  displayName?: string;
};

type SeedPasswordSource =
  | "input-file"
  | "MINGLE_ADMIN_PASSWORD"
  | "default-change-me-admin";

function resolveDefaultSeedPassword(): {
  password: string;
  source: SeedPasswordSource;
} {
  const configuredPassword = process.env.MINGLE_ADMIN_PASSWORD?.trim();
  if (configuredPassword) {
    return {
      password: configuredPassword,
      source: "MINGLE_ADMIN_PASSWORD"
    };
  }

  return {
    password: "change-me-admin",
    source: "default-change-me-admin"
  };
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin seed??URL怨?service role key媛 ?꾩슂?⑸땲??");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function normalizeAdminId(input: SeedAdminUserInput) {
  if (input.id?.trim()) {
    return input.id.trim();
  }

  if (input.email?.trim()) {
    return input.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  }

  throw new Error("admin seed??id 또는 email 중 하나는 필요합니다.");
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArgIndex = args.findIndex((arg) => arg === "--file");
  const filePath =
    fileArgIndex >= 0 && args[fileArgIndex + 1]
      ? path.resolve(args[fileArgIndex + 1]!)
      : null;

  return {
    dryRun,
    filePath
  };
}

async function readSeedUsers(filePath: string | null): Promise<SeedAdminUserInput[]> {
  if (filePath) {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SeedAdminUserInput[];
  }

  const defaultPassword = resolveDefaultSeedPassword().password;

  return [
    {
      id: "hq_admin_default",
      email: "hq-admin@mingle.local",
      password: defaultPassword,
      role: "HQ_ADMIN",
      branchId: null,
      displayName: "HQ Admin"
    },
    {
      id: "branch_admin_seongsu",
      email: "branch-admin-seongsu@mingle.local",
      password: defaultPassword,
      role: "BRANCH_ADMIN",
      branchId: process.env.MINGLE_SEED_BRANCH_ID ?? "branch_seongsu",
      displayName: "Branch Admin"
    }
  ];
}

export async function seedAdminUsers(options: { filePath: string | null; dryRun: boolean }) {
  const users = await readSeedUsers(options.filePath);
  const defaultPasswordSource = options.filePath
    ? "input-file"
    : resolveDefaultSeedPassword().source;
  const rows = users.map((user) => ({
    id: normalizeAdminId(user),
    email: user.email?.trim().toLowerCase() ?? null,
    password_hash: hashAdminPassword(user.password),
    role: user.role,
    branch_id: user.branchId ?? null,
    is_active: true,
    display_name:
      user.displayName ??
      (user.role === "HQ_ADMIN" ? "HQ Admin" : user.role === "BRANCH_ADMIN" ? "Branch Admin" : "Staff"),
    updated_at: new Date().toISOString()
  }));

  if (options.dryRun) {
    console.info(
      `[mingle-authority][admin-seed] ${JSON.stringify({
        dryRun: true,
        total: rows.length,
        passwordSource: defaultPasswordSource,
        users: rows.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          branchId: row.branch_id
        }))
      })}`
    );
    return rows.length;
  }

  const client = createSupabaseAdminClient();
  const { error } = await client.from("admin_users").upsert(rows);
  if (error) {
    throw new Error(`admin_users seed upsert???ㅽ뙣?덉뒿?덈떎. ${error.message}`);
  }

  console.info(
    `[mingle-authority][admin-seed] ${JSON.stringify({
      dryRun: false,
      total: rows.length,
      passwordSource: defaultPasswordSource
    })}`
  );
  return rows.length;
}

async function main() {
  const options = parseArgs(process.argv);
  await seedAdminUsers(options);
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(
      `[mingle-authority][admin-seed-error] ${JSON.stringify({
        message: error instanceof Error ? error.message : "unknown admin seed error"
      })}`
    );
    process.exitCode = 1;
  });
}
