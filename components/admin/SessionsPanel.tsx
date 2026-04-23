"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import type {
  BranchRecord,
  ManagedSessionRecord,
  ManagedSessionUpsertInput,
  SessionLifecycleStatus
} from "@/types/mingle";

type SessionFormState = {
  id: string;
  name: string;
  branchId: string;
  eventId: string;
  venueName: string;
  venueAddress: string;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  attendanceLabel: string;
  attendanceHint: string;
  code: string;
  tableCount: string;
  tableCapacity: string;
  maxCapacity: string;
  status: SessionLifecycleStatus;
};

const EMPTY_FORM: SessionFormState = {
  id: "",
  name: "",
  branchId: "",
  eventId: "",
  venueName: "",
  venueAddress: "",
  sessionDateLabel: "",
  sessionTimeLabel: "",
  attendanceLabel: "",
  attendanceHint: "",
  code: "",
  tableCount: "5",
  tableCapacity: "6",
  maxCapacity: "30",
  status: "DRAFT"
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || "요청 처리에 실패했습니다.");
  }

  return (await response.json()) as T;
}

export function SessionsPanel({ adminBranchId }: { adminBranchId: string | null }) {
  const [sessions, setSessions] = useState<ManagedSessionRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [form, setForm] = useState<SessionFormState>(EMPTY_FORM);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning"; message: string } | null>(
    null
  );

  const availableBranches = useMemo(
    () => branches.filter((branch) => branch.isActive),
    [branches]
  );

  async function load() {
    setLoading(true);
    try {
      const [sessionsResponse, branchesResponse] = await Promise.all([
        fetch("/api/admin/sessions", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        }),
        fetch("/api/admin/branches", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        })
      ]);

      const sessionsPayload = await parseJson<{ sessions: ManagedSessionRecord[] }>(
        sessionsResponse
      );
      const branchesPayload = await parseJson<{ branches: BranchRecord[] }>(branchesResponse);
      setSessions(sessionsPayload.sessions);
      setBranches(branchesPayload.branches);

      if (!editingSessionId && adminBranchId && !form.branchId) {
        setForm((current) => ({ ...current, branchId: adminBranchId }));
      }
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "세션 목록을 불러오지 못했습니다."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      branchId: adminBranchId ?? ""
    });
    setEditingSessionId(null);
  }

  function buildInput(): ManagedSessionUpsertInput {
    return {
      id: form.id || undefined,
      name: form.name,
      branchId: form.branchId,
      eventId: form.eventId,
      venueName: form.venueName,
      venueAddress: form.venueAddress,
      sessionDateLabel: form.sessionDateLabel,
      sessionTimeLabel: form.sessionTimeLabel,
      attendanceLabel: form.attendanceLabel,
      attendanceHint: form.attendanceHint,
      code: form.code,
      tableCount: Number(form.tableCount),
      tableCapacity: Number(form.tableCapacity),
      maxCapacity: Number(form.maxCapacity),
      status: form.status
    };
  }

  async function submit() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(
        editingSessionId ? `/api/admin/sessions/${editingSessionId}` : "/api/admin/sessions",
        {
          method: editingSessionId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(buildInput())
        }
      );

      await parseJson<{ session: ManagedSessionRecord }>(response);
      setFeedback({
        tone: "success",
        message: editingSessionId ? "세션 정보를 수정했습니다." : "세션을 생성했습니다."
      });
      resetForm();
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "세션 저장에 실패했습니다."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(session: ManagedSessionRecord, status: SessionLifecycleStatus) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ status })
      });

      await parseJson<{ session: ManagedSessionRecord }>(response);
      setFeedback({
        tone: "success",
        message:
          status === "OPEN"
            ? "세션을 오픈했습니다."
            : status === "CLOSED"
              ? "세션을 종료했습니다."
              : "세션 상태를 변경했습니다."
      });
      await load();
    } catch (error) {
      setFeedback({
        tone: "warning",
        message: error instanceof Error ? error.message : "세션 상태 변경에 실패했습니다."
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
            eyebrow="SESSIONS"
            title="세션 관리"
            description="브랜치별 세션을 생성하고, 메타데이터와 운영 상태를 웹에서 관리합니다."
          />

          <div className="compact-stack">
            <label className="field">
              <span>세션 ID (선택)</span>
              <input
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                disabled={Boolean(editingSessionId) || submitting}
              />
            </label>

            <label className="field">
              <span>세션 이름</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={submitting}
              />
            </label>

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>브랜치</span>
                <select
                  value={form.branchId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, branchId: event.target.value }))
                  }
                  disabled={submitting || Boolean(adminBranchId)}
                >
                  <option value="">브랜치 선택</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field" style={{ flex: 1 }}>
                <span>Event ID</span>
                <input
                  value={form.eventId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, eventId: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>장소명</span>
                <input
                  value={form.venueName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, venueName: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>위치</span>
                <input
                  value={form.venueAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, venueAddress: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>날짜 라벨</span>
                <input
                  value={form.sessionDateLabel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sessionDateLabel: event.target.value
                    }))
                  }
                  disabled={submitting}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>시간 라벨</span>
                <input
                  value={form.sessionTimeLabel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sessionTimeLabel: event.target.value
                    }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>

            <label className="field">
              <span>세션 코드</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                disabled={submitting}
              />
            </label>

            <div className="compact-row">
              <label className="field" style={{ flex: 1 }}>
                <span>테이블 수</span>
                <input
                  type="number"
                  min={1}
                  value={form.tableCount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tableCount: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>테이블당 수용 인원</span>
                <input
                  type="number"
                  min={1}
                  value={form.tableCapacity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tableCapacity: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>최대 수용 인원</span>
                <input
                  type="number"
                  min={1}
                  value={form.maxCapacity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxCapacity: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>

            <label className="field">
              <span>운영 상태</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as SessionLifecycleStatus
                  }))
                }
                disabled={submitting}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>

            <label className="field">
              <span>출석 라벨</span>
              <input
                value={form.attendanceLabel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    attendanceLabel: event.target.value
                  }))
                }
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span>안내 문구</span>
              <input
                value={form.attendanceHint}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    attendanceHint: event.target.value
                  }))
                }
                disabled={submitting}
              />
            </label>

            {feedback ? (
              <p className={feedback.tone === "warning" ? "field-error" : "field-help"}>
                {feedback.message}
              </p>
            ) : null}

            <div className="button-row wrap-row">
              <Button onClick={() => void submit()} disabled={submitting || !form.name.trim()}>
                {editingSessionId ? "세션 수정" : "세션 생성"}
              </Button>
              {editingSessionId ? (
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
            title="세션 목록"
            description="오픈/종료/비활성화는 soft state로 남기고, 메타데이터를 보존합니다."
            actions={<Badge tone="accent">{sessions.length}</Badge>}
          />

          {loading ? (
            <p>불러오는 중...</p>
          ) : sessions.length ? (
            <div className="compact-stack">
              {sessions.map((session) => (
                <div key={session.id} className="participant-card">
                  <div className="participant-head">
                    <div className="participant-copy">
                      <strong>{session.name}</strong>
                      <p>Session ID: {session.id}</p>
                      <p>Branch: {session.branchName} ({session.branchId})</p>
                      <p>Event ID: {session.eventId}</p>
                      <p>Code: {session.code}</p>
                      <p>
                        Capacity: {session.maxCapacity} / tables {session.tableCount} / seats{" "}
                        {session.tableCapacity}
                      </p>
                      <p>Updated at: {session.updatedAt}</p>
                      <p>Updated by: {session.updatedBy ?? "system"}</p>
                    </div>
                    <Badge tone={session.status === "OPEN" ? "success" : "warning"}>
                      {session.status}
                    </Badge>
                  </div>

                  <div className="button-row wrap-row">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingSessionId(session.id);
                        setForm({
                          id: session.id,
                          name: session.name,
                          branchId: session.branchId,
                          eventId: session.eventId,
                          venueName: session.venueName,
                          venueAddress: session.venueAddress,
                          sessionDateLabel: session.sessionDateLabel,
                          sessionTimeLabel: session.sessionTimeLabel,
                          attendanceLabel: session.attendanceLabel,
                          attendanceHint: session.attendanceHint,
                          code: session.code,
                          tableCount: String(session.tableCount),
                          tableCapacity: String(session.tableCapacity),
                          maxCapacity: String(session.maxCapacity),
                          status: session.status
                        });
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void updateStatus(session, "OPEN")}
                      disabled={session.status === "OPEN"}
                    >
                      오픈
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void updateStatus(session, "CLOSED")}
                      disabled={session.status === "CLOSED"}
                    >
                      종료
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => void updateStatus(session, "DISABLED")}
                      disabled={session.status === "DISABLED"}
                    >
                      비활성화
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="등록된 세션이 없습니다."
              description="브랜치별로 세션을 생성해 운영 상태를 시작하세요."
            />
          )}
        </Surface>
      </div>
    </div>
  );
}
