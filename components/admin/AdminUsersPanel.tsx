"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import type {
  AdminRole,
  AdminUserCreateInput,
  AdminUserSummary,
  BranchRecord
} from "@/types/mingle";

type UserFormState = {
  id: string;
  email: string;
  displayName: string;
  password: string;
  role: AdminRole;
  branchId: string;
  isActive: boolean;
};

const EMPTY_FORM: UserFormState = {
  id: "",
  email: "",
  displayName: "",
  password: "",
  role: "STAFF",
  branchId: "",
  isActive: true
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || "요청 처리에 실패했습니다.");
  }

  return (await response.json()) as T;
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning"; message: string } | null>(
    null
  );

  const visibleBranches = useMemo(
    () => branches.filter((branch) => branch.isActive),
    [branches]
  );

  async function load() {
    setLoading(true);
    try {
      const [usersResponse, branchesResponse] = await Promise.all([
        fetch("/api/admin/users", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        }),
        fetch("/api/admin/branches", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        })
      ]);

      const usersPayload = await parseJson<{ users: AdminUserSummary[] }>(usersResponse);
      const branchesPayload = await parseJson<{ branches: BranchRecord[] }>(branchesResponse);
      setUsers(usersPayload.users);
      setBranches(branchesPayload.branches);
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "관리자 사용자 목록을 불러오지 못했습니다."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
  }

  async function submit() {
    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingUserId) {
        const response = await fetch(`/api/admin/users/${editingUserId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            type: "update",
            input: {
              email: form.email,
              displayName: form.displayName,
              role: form.role,
              branchId: form.role === "HQ_ADMIN" ? null : form.branchId || null,
              isActive: form.isActive
            }
          })
        });

        await parseJson<{ user: AdminUserSummary }>(response);
        setFeedback({ tone: "success", message: "관리자 사용자 정보를 수정했습니다." });
      } else {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            id: form.id || undefined,
            email: form.email,
            password: form.password,
            displayName: form.displayName,
            role: form.role,
            branchId: form.role === "HQ_ADMIN" ? null : form.branchId || null
          } satisfies AdminUserCreateInput)
        });

        await parseJson<{ user: AdminUserSummary }>(response);
        setFeedback({ tone: "success", message: "관리자 사용자를 생성했습니다." });
      }

      resetForm();
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "관리자 사용자 저장에 실패했습니다."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUser(user: AdminUserSummary) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          type: "update",
          input: {
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            branchId: user.role === "HQ_ADMIN" ? null : user.branchId,
            isActive: !user.isActive
          }
        })
      });

      await parseJson<{ user: AdminUserSummary }>(response);
      setFeedback({
        tone: "success",
        message: user.isActive
          ? "관리자 사용자를 비활성화했습니다."
          : "관리자 사용자를 다시 활성화했습니다."
      });
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "관리자 상태 변경에 실패했습니다."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(user: AdminUserSummary) {
    const password = window.prompt(`${user.displayName} 계정의 새 비밀번호를 입력해 주세요.`);
    if (!password) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          type: "reset-password",
          password
        })
      });

      await parseJson<{ user: AdminUserSummary }>(response);
      setFeedback({ tone: "success", message: "관리자 비밀번호를 재설정했습니다." });
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "비밀번호 재설정에 실패했습니다."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-grid">
      <div className="admin-main-column">
        <Surface>
          <SectionHeader
            eyebrow="ADMIN USERS"
            title="운영 계정 관리"
            description="관리자 계정을 생성, 수정, 비활성화하고 역할과 브랜치를 배정합니다."
          />

          <div className="compact-stack">
            <label className="field">
              <span>관리자 ID (선택)</span>
              <input
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="hq_admin_ops"
                disabled={Boolean(editingUserId) || submitting}
              />
            </label>

            <label className="field">
              <span>로그인 이메일</span>
              <input
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="ops@mingle.local"
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span>표시 이름</span>
              <input
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="HQ Ops"
                disabled={submitting}
              />
            </label>

            {!editingUserId ? (
              <label className="field">
                <span>초기 비밀번호</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
            ) : null}

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>역할</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as AdminRole,
                      branchId: event.target.value === "HQ_ADMIN" ? "" : current.branchId
                    }))
                  }
                  disabled={submitting}
                >
                  <option value="HQ_ADMIN">HQ_ADMIN</option>
                  <option value="BRANCH_ADMIN">BRANCH_ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </label>

              <label className="field" style={{ flex: 1 }}>
                <span>브랜치</span>
                <select
                  value={form.branchId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, branchId: event.target.value }))
                  }
                  disabled={submitting || form.role === "HQ_ADMIN"}
                >
                  <option value="">선택 안 함</option>
                  {visibleBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {editingUserId ? (
              <label className="field">
                <span>활성 상태</span>
                <select
                  value={form.isActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.value === "ACTIVE"
                    }))
                  }
                  disabled={submitting}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            ) : null}

            {feedback ? (
              <p className={feedback.tone === "warning" ? "field-error" : "field-help"}>
                {feedback.message}
              </p>
            ) : null}

            <div className="button-row wrap-row">
              <Button
                onClick={() => void submit()}
                disabled={
                  submitting ||
                  !form.email.trim() ||
                  !form.displayName.trim() ||
                  (!editingUserId && !form.password.trim())
                }
              >
                {editingUserId ? "관리자 수정" : "관리자 생성"}
              </Button>
              {editingUserId ? (
                <Button variant="secondary" onClick={resetForm} disabled={submitting}>
                  편집 취소
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      </div>

      <div className="admin-side-column">
        <Surface>
          <SectionHeader
            eyebrow="LIST"
            title="관리자 사용자 목록"
            description="비밀번호 해시는 노출하지 않고, 상태와 마지막 로그인만 표시합니다."
            actions={<Badge tone="accent">{users.length}</Badge>}
          />

          {loading ? (
            <p>불러오는 중...</p>
          ) : users.length ? (
            <div className="compact-stack">
              {users.map((user) => (
                <div key={user.id} className="participant-card">
                  <div className="participant-head">
                    <div className="participant-copy">
                      <strong>{user.displayName}</strong>
                      <p>{user.email ?? "이메일 없음"}</p>
                      <p>Admin ID: {user.id}</p>
                      <p>Role: {user.role}</p>
                      <p>Branch: {user.branchId ?? "HQ"}</p>
                      <p>Status: {user.isActive ? "ACTIVE" : "INACTIVE"}</p>
                      <p>Last login: {user.lastLoginAt ?? "아직 없음"}</p>
                      <p>Updated at: {user.updatedAt}</p>
                      <p>Updated by: {user.updatedBy ?? "system"}</p>
                    </div>
                    <Badge tone={user.isActive ? "success" : "warning"}>
                      {user.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>

                  <div className="button-row wrap-row">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingUserId(user.id);
                        setForm({
                          id: user.id,
                          email: user.email ?? "",
                          displayName: user.displayName,
                          password: "",
                          role: user.role,
                          branchId: user.branchId ?? "",
                          isActive: user.isActive
                        });
                      }}
                    >
                      수정
                    </Button>
                    <Button variant="secondary" onClick={() => void resetPassword(user)}>
                      비밀번호 재설정
                    </Button>
                    <Button
                      variant={user.isActive ? "danger" : "secondary"}
                      onClick={() => void toggleUser(user)}
                    >
                      {user.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="등록된 관리자 사용자가 없습니다."
              description="운영 계정을 생성해 HQ/브랜치 관리자 구조를 시작하세요."
            />
          )}
        </Surface>
      </div>
    </div>
  );
}
