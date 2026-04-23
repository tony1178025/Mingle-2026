import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  hashAdminPassword,
  resolveAdminBootstrapPassword,
  type AdminBootstrapPasswordSource
} from "../lib/admin-user-store.ts";
import type { AdminRole, AdminUserRow } from "../types/mingle.ts";

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

type SeedPasswordSource = "input-file" | AdminBootstrapPasswordSource;

type SeedAdminRowsResult = {
  rows: AdminUserRow[];
  passwordSource: SeedPasswordSource;
};

function requireBootstrapSeedPassword() {
  const bootstrapPassword = resolveAdminBootstrapPassword();
  if (!bootstrapPassword) {
    throw new Error(
      "Set MINGLE_ADMIN_BOOTSTRAP_PASSWORD or MINGLE_ADMIN_PASSWORD before seeding admin users."
    );
  }

  return bootstrapPassword;
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin seed requires URL and service role key.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function normalizeAdminId(input: SeedAdminUserInput) {
  if (input.id?.trim()) {
    return input.id.trim().toLowerCase();
  }

  if (input.email?.trim()) {
    return input.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  }

  throw new Error("Admin seed requires either an id or an email.");
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

async function readSeedUsers(filePath: string | null): Promise<{
  users: SeedAdminUserInput[];
  passwordSource: SeedPasswordSource;
}> {
  if (filePath) {
    const raw = await readFile(filePath, "utf8");
    return {
      users: JSON.parse(raw) as SeedAdminUserInput[],
      passwordSource: "input-file"
    };
  }

  const bootstrapPassword = requireBootstrapSeedPassword();

  return {
    users: [
      {
        id: "hq_admin_default",
        email: "hq-admin@mingle.local",
        password: bootstrapPassword.password,
        role: "HQ_ADMIN",
        branchId: null,
        displayName: "HQ Admin"
      },
      {
        id: "branch_admin_seongsu",
        email: "branch-admin-seongsu@mingle.local",
        password: bootstrapPassword.password,
        role: "BRANCH_ADMIN",
        branchId: process.env.MINGLE_SEED_BRANCH_ID ?? "branch_seongsu",
        displayName: "Branch Admin"
      }
    ],
    passwordSource: bootstrapPassword.source
  };
}

export async function buildSeedAdminUserRows(filePath: string | null): Promise<SeedAdminRowsResult> {
  const { users, passwordSource } = await readSeedUsers(filePath);
  const rows = users.map((user) => {
    const now = new Date().toISOString();
    return {
      id: normalizeAdminId(user),
      email: user.email?.trim().toLowerCase() ?? null,
      password_hash: hashAdminPassword(user.password),
      role: user.role,
      branch_id: user.branchId ?? null,
      is_active: true,
      display_name:
        user.displayName ??
        (user.role === "HQ_ADMIN"
          ? "HQ Admin"
          : user.role === "BRANCH_ADMIN"
            ? "Branch Admin"
            : "Staff"),
      created_at: now,
      updated_at: now,
      last_login_at: null,
      updated_by: "seed"
    } satisfies AdminUserRow;
  });

  return {
    rows,
    passwordSource
  };
}

export async function seedAdminUsers(options: { filePath: string | null; dryRun: boolean }) {
  const { rows, passwordSource } = await buildSeedAdminUserRows(options.filePath);

  if (options.dryRun) {
    console.info(
      `[mingle-authority][admin-seed] ${JSON.stringify({
        dryRun: true,
        total: rows.length,
        passwordSource,
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
    throw new Error(`admin_users seed upsert failed. ${error.message}`);
  }

  console.info(
    `[mingle-authority][admin-seed] ${JSON.stringify({
      dryRun: false,
      total: rows.length,
      passwordSource
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
