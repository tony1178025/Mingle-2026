import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminSessionRecord,
  AdminUserCreateInput,
  AdminUserRecord,
  AdminUserRow,
  AdminUserSummary,
  AdminUserUpdateInput
} from "../types/mingle.ts";

export interface AdminUserStore {
  isConfigured(): boolean;
  findAdminSessionByCredentials(
    login: string,
    password: string
  ): Promise<AdminSessionRecord | null>;
  listAdminUsers(): Promise<AdminUserSummary[]>;
  createAdminUser(input: AdminUserCreateInput, updatedBy: string): Promise<AdminUserSummary>;
  updateAdminUser(
    adminUserId: string,
    input: AdminUserUpdateInput,
    updatedBy: string
  ): Promise<AdminUserSummary>;
  resetAdminUserPassword(
    adminUserId: string,
    password: string,
    updatedBy: string
  ): Promise<AdminUserSummary>;
}

type InMemoryAdminUserStoreOptions = {
  users: AdminUserRecord[];
};

let adminUserStoreOverride: AdminUserStore | null = null;

export function hashAdminPassword(password: string) {
  return createHash("sha256").update(`mingle-admin:${password}`).digest("hex");
}

function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

function normalizeAdminUserInput<T extends { email: string | null; role: string; branchId: string | null }>(
  input: T
) {
  const email = input.email?.trim().toLowerCase() ?? null;
  const role = input.role;
  const branchId = role === "HQ_ADMIN" ? null : input.branchId?.trim() || null;

  if (!email) {
    throw new Error("관리자 로그인 이메일을 입력해 주세요.");
  }

  if (role !== "HQ_ADMIN" && !branchId) {
    throw new Error("지점 관리자와 스태프는 브랜치 지정이 필요합니다.");
  }

  return {
    ...input,
    email,
    branchId
  };
}

function mapAdminUserRow(row: AdminUserRow): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    branchId: row.branch_id,
    isActive: row.is_active,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    updatedBy: row.updated_by
  };
}

function sanitizeAdminUser(record: AdminUserRecord): AdminUserSummary {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    branchId: record.branchId,
    isActive: record.isActive,
    displayName: record.displayName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastLoginAt: record.lastLoginAt,
    updatedBy: record.updatedBy
  };
}

async function assertEmailAvailable(
  client: SupabaseClient,
  email: string,
  excludeAdminUserId?: string
) {
  let query = client.from("admin_users").select("id").eq("email", email);
  if (excludeAdminUserId) {
    query = query.neq("id", excludeAdminUserId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`관리자 이메일 중복 여부를 확인하지 못했습니다. ${error.message}`);
  }

  if (data?.id) {
    throw new Error("이미 사용 중인 관리자 이메일입니다.");
  }
}

class SupabaseAdminUserStore implements AdminUserStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  isConfigured() {
    return true;
  }

  async findAdminSessionByCredentials(login: string, password: string) {
    const normalizedLogin = normalizeLogin(login);
    const passwordHash = hashAdminPassword(password);
    const { data, error } = await this.client
      .from("admin_users")
      .select("*")
      .or(`id.eq.${normalizedLogin},email.eq.${normalizedLogin}`)
      .eq("password_hash", passwordHash)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`관리자 사용자 정보를 조회하지 못했습니다. ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await this.client
      .from("admin_users")
      .update({ last_login_at: now, updated_at: now })
      .eq("id", data.id);

    if (updateError) {
      throw new Error(`관리자 마지막 로그인 시간을 기록하지 못했습니다. ${updateError.message}`);
    }

    const adminUser = mapAdminUserRow({
      ...(data as AdminUserRow),
      last_login_at: now,
      updated_at: now
    });
    return {
      adminUserId: adminUser.id,
      role: adminUser.role,
      branchId: adminUser.branchId
    };
  }

  async listAdminUsers() {
    const { data, error } = await this.client
      .from("admin_users")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`관리자 사용자 목록을 조회하지 못했습니다. ${error.message}`);
    }

    return (data ?? []).map((row) => sanitizeAdminUser(mapAdminUserRow(row as AdminUserRow)));
  }

  async createAdminUser(input: AdminUserCreateInput, updatedBy: string) {
    const normalized = normalizeAdminUserInput(input);
    await assertEmailAvailable(this.client, normalized.email);
    const now = new Date().toISOString();
    const row: AdminUserRow = {
      id: input.id?.trim() || normalized.email.replace(/[^a-z0-9]+/g, "_"),
      email: normalized.email,
      password_hash: hashAdminPassword(input.password),
      role: normalized.role,
      branch_id: normalized.branchId,
      is_active: true,
      display_name: input.displayName.trim(),
      created_at: now,
      updated_at: now,
      last_login_at: null,
      updated_by: updatedBy
    };

    const { data, error } = await this.client
      .from("admin_users")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(`관리자 사용자를 생성하지 못했습니다. ${error.message}`);
    }

    return sanitizeAdminUser(mapAdminUserRow(data as AdminUserRow));
  }

  async updateAdminUser(adminUserId: string, input: AdminUserUpdateInput, updatedBy: string) {
    const normalized = normalizeAdminUserInput(input);
    await assertEmailAvailable(this.client, normalized.email, adminUserId);
    const { data, error } = await this.client
      .from("admin_users")
      .update({
        email: normalized.email,
        role: normalized.role,
        branch_id: normalized.branchId,
        is_active: input.isActive,
        display_name: input.displayName.trim(),
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      })
      .eq("id", adminUserId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`관리자 사용자 정보를 수정하지 못했습니다. ${error.message}`);
    }

    return sanitizeAdminUser(mapAdminUserRow(data as AdminUserRow));
  }

  async resetAdminUserPassword(adminUserId: string, password: string, updatedBy: string) {
    const { data, error } = await this.client
      .from("admin_users")
      .update({
        password_hash: hashAdminPassword(password),
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      })
      .eq("id", adminUserId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`관리자 비밀번호를 재설정하지 못했습니다. ${error.message}`);
    }

    return sanitizeAdminUser(mapAdminUserRow(data as AdminUserRow));
  }
}

export function createInMemoryAdminUserStore(
  options: InMemoryAdminUserStoreOptions
): AdminUserStore {
  const users = [...options.users];

  function findUser(adminUserId: string) {
    const user = users.find((candidate) => candidate.id === adminUserId);
    if (!user) {
      throw new Error("관리자 사용자를 찾을 수 없습니다.");
    }

    return user;
  }

  function ensureEmailAvailable(email: string, excludeAdminUserId?: string) {
    const conflict = users.find(
      (candidate) => candidate.email === email && candidate.id !== excludeAdminUserId
    );
    if (conflict) {
      throw new Error("이미 사용 중인 관리자 이메일입니다.");
    }
  }

  return {
    isConfigured() {
      return true;
    },

    async findAdminSessionByCredentials(login: string, password: string) {
      const normalizedLogin = normalizeLogin(login);
      const passwordHash = hashAdminPassword(password);
      const user = users.find(
        (candidate) =>
          candidate.isActive &&
          candidate.passwordHash === passwordHash &&
          (candidate.id === normalizedLogin || candidate.email === normalizedLogin)
      );

      if (!user) {
        return null;
      }

      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = user.lastLoginAt;

      return {
        adminUserId: user.id,
        role: user.role,
        branchId: user.branchId
      };
    },

    async listAdminUsers() {
      return users
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(sanitizeAdminUser);
    },

    async createAdminUser(input: AdminUserCreateInput, updatedBy: string) {
      const normalized = normalizeAdminUserInput(input);
      ensureEmailAvailable(normalized.email);
      const now = new Date().toISOString();
      const record: AdminUserRecord = {
        id: input.id?.trim() || normalized.email.replace(/[^a-z0-9]+/g, "_"),
        email: normalized.email,
        passwordHash: hashAdminPassword(input.password),
        role: normalized.role,
        branchId: normalized.branchId,
        isActive: true,
        displayName: input.displayName.trim(),
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        updatedBy
      };
      users.push(record);
      return sanitizeAdminUser(record);
    },

    async updateAdminUser(adminUserId: string, input: AdminUserUpdateInput, updatedBy: string) {
      const normalized = normalizeAdminUserInput(input);
      ensureEmailAvailable(normalized.email, adminUserId);
      const user = findUser(adminUserId);
      user.email = normalized.email;
      user.role = normalized.role;
      user.branchId = normalized.branchId;
      user.isActive = input.isActive;
      user.displayName = input.displayName.trim();
      user.updatedAt = new Date().toISOString();
      user.updatedBy = updatedBy;
      return sanitizeAdminUser(user);
    },

    async resetAdminUserPassword(adminUserId: string, password: string, updatedBy: string) {
      const user = findUser(adminUserId);
      user.passwordHash = hashAdminPassword(password);
      user.updatedAt = new Date().toISOString();
      user.updatedBy = updatedBy;
      return sanitizeAdminUser(user);
    }
  };
}

function isSupabaseAdminStoreConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function createSupabaseAdminClient() {
  if (!isSupabaseAdminStoreConfigured()) {
    throw new Error("Supabase admin user store 환경 변수가 설정되지 않았습니다.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
}

let defaultAdminUserStore: AdminUserStore | null = null;

export function getAdminUserStore() {
  if (adminUserStoreOverride) {
    return adminUserStoreOverride;
  }

  if (!isSupabaseAdminStoreConfigured()) {
    return null;
  }

  defaultAdminUserStore ??= new SupabaseAdminUserStore(createSupabaseAdminClient());
  return defaultAdminUserStore;
}

export function setAdminUserStoreForTests(store: AdminUserStore | null) {
  adminUserStoreOverride = store;
  defaultAdminUserStore = null;
}
