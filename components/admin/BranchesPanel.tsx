"use client";

import { useEffect, useState } from "react";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import type { BranchRecord, BranchUpsertInput } from "@/types/mingle";

type BranchFormState = {
  id: string;
  name: string;
  venueName: string;
  venueAddress: string;
  defaultMaxCapacity: string;
  defaultTableCount: string;
  isActive: boolean;
};

const EMPTY_FORM: BranchFormState = {
  id: "",
  name: "",
  venueName: "",
  venueAddress: "",
  defaultMaxCapacity: "30",
  defaultTableCount: "5",
  isActive: true
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || "요청 처리에 실패했습니다.");
  }

  return (await response.json()) as T;
}

export function BranchesPanel() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [form, setForm] = useState<BranchFormState>(EMPTY_FORM);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning"; message: string } | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/branches", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const payload = await parseJson<{ branches: BranchRecord[] }>(response);
      setBranches(payload.branches);
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "브랜치 목록을 불러오지 못했습니다."
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
    setEditingBranchId(null);
  }

  async function submit() {
    setSubmitting(true);
    setFeedback(null);

    const input: BranchUpsertInput = {
      id: form.id || undefined,
      name: form.name,
      venueName: form.venueName,
      venueAddress: form.venueAddress,
      defaultMaxCapacity: Number(form.defaultMaxCapacity),
      defaultTableCount: Number(form.defaultTableCount),
      isActive: form.isActive
    };

    try {
      const response = await fetch(
        editingBranchId ? `/api/admin/branches/${editingBranchId}` : "/api/admin/branches",
        {
          method: editingBranchId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(input)
        }
      );

      await parseJson<{ branch: BranchRecord }>(response);
      setFeedback({
        tone: "success",
        message: editingBranchId ? "브랜치 정보를 수정했습니다." : "브랜치를 생성했습니다."
      });
      resetForm();
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "브랜치 저장에 실패했습니다."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleBranch(branch: BranchRecord) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: branch.name,
          venueName: branch.venueName,
          venueAddress: branch.venueAddress,
          defaultMaxCapacity: branch.defaultMaxCapacity,
          defaultTableCount: branch.defaultTableCount,
          isActive: !branch.isActive
        } satisfies BranchUpsertInput)
      });

      await parseJson<{ branch: BranchRecord }>(response);
      setFeedback({
        tone: "success",
        message: branch.isActive ? "브랜치를 비활성화했습니다." : "브랜치를 다시 활성화했습니다."
      });
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "브랜치 상태 변경에 실패했습니다."
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
            eyebrow="BRANCHES"
            title="브랜치 관리"
            description="브랜치 이름, 위치, 기본 수용 인원과 기본 테이블 수를 웹에서 관리합니다."
          />

          <div className="compact-stack">
            <label className="field">
              <span>브랜치 ID (선택)</span>
              <input
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                disabled={Boolean(editingBranchId) || submitting}
              />
            </label>

            <label className="field">
              <span>브랜치 이름</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span>장소명</span>
              <input
                value={form.venueName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, venueName: event.target.value }))
                }
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span>위치</span>
              <input
                value={form.venueAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, venueAddress: event.target.value }))
                }
                disabled={submitting}
              />
            </label>

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>기본 최대 수용 인원</span>
                <input
                  type="number"
                  min={1}
                  value={form.defaultMaxCapacity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultMaxCapacity: event.target.value
                    }))
                  }
                  disabled={submitting}
                />
              </label>

              <label className="field" style={{ flex: 1 }}>
                <span>기본 테이블 수</span>
                <input
                  type="number"
                  min={1}
                  value={form.defaultTableCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      defaultTableCount: event.target.value
                    }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>

            <label className="field">
              <span>상태</span>
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

            {feedback ? (
              <p className={feedback.tone === "warning" ? "field-error" : "field-help"}>
                {feedback.message}
              </p>
            ) : null}

            <div className="button-row wrap-row">
              <Button onClick={() => void submit()} disabled={submitting || !form.name.trim()}>
                {editingBranchId ? "브랜치 수정" : "브랜치 생성"}
              </Button>
              {editingBranchId ? (
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
            title="브랜치 목록"
            description="브랜치는 soft-disable만 가능하며, 운영 메타데이터를 보존합니다."
            actions={<Badge tone="accent">{branches.length}</Badge>}
          />

          {loading ? (
            <p>불러오는 중...</p>
          ) : branches.length ? (
            <div className="compact-stack">
              {branches.map((branch) => (
                <div key={branch.id} className="participant-card">
                  <div className="participant-head">
                    <div className="participant-copy">
                      <strong>{branch.name}</strong>
                      <p>Branch ID: {branch.id}</p>
                      <p>Venue: {branch.venueName}</p>
                      <p>Location: {branch.venueAddress}</p>
                      <p>Default max capacity: {branch.defaultMaxCapacity}</p>
                      <p>Default table count: {branch.defaultTableCount}</p>
                      <p>Updated at: {branch.updatedAt}</p>
                      <p>Updated by: {branch.updatedBy ?? "system"}</p>
                    </div>
                    <Badge tone={branch.isActive ? "success" : "warning"}>
                      {branch.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>

                  <div className="button-row wrap-row">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingBranchId(branch.id);
                        setForm({
                          id: branch.id,
                          name: branch.name,
                          venueName: branch.venueName,
                          venueAddress: branch.venueAddress,
                          defaultMaxCapacity: String(branch.defaultMaxCapacity),
                          defaultTableCount: String(branch.defaultTableCount),
                          isActive: branch.isActive
                        });
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant={branch.isActive ? "danger" : "secondary"}
                      onClick={() => void toggleBranch(branch)}
                    >
                      {branch.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="등록된 브랜치가 없습니다."
              description="첫 브랜치를 생성해 운영 구조를 시작하세요."
            />
          )}
        </Surface>
      </div>
    </div>
  );
}
