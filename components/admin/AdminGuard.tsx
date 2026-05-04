"use client";

import { FormEvent, useState } from "react";
import { Button, Surface } from "@/components/shared/ui";
import { parseFetchResponseJson } from "@/lib/api/parse-fetch-response";

export function AdminGuard({ configured }: { configured: boolean }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ login, password })
      });

      await parseFetchResponseJson<{ adminSession: unknown }>(response);

      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "관리자 인증에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <main className="admin-shell">
      <div className="admin-stage">
        <Surface className="admin-hero">
          <div className="hero-copy-stack">
            <p className="eyebrow">ADMIN ACCESS</p>
            <h1 className="admin-title">운영자 인증이 필요합니다.</h1>
            <p className="admin-description">
              운영 대시보드는 보호된 영역입니다. 로그인 ID 또는 이메일과 비밀번호를 입력해
              접속해 주세요.
            </p>
          </div>
        </Surface>

        <Surface>
          {configured ? (
            <form className="compact-stack" onSubmit={submit}>
              <label className="field">
                <span>로그인 ID 또는 이메일</span>
                <input
                  type="text"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </label>

              <label className="field">
                <span>관리자 비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>

              {error ? <p className="field-error">{error}</p> : null}

              <Button type="submit" block disabled={loading || !login.trim() || !password.trim()}>
                {loading ? "확인 중..." : "관리자 로그인"}
              </Button>
            </form>
          ) : (
            <div className="compact-stack">
              <strong>관리자 사용자 스토어가 아직 준비되지 않았습니다.</strong>
              <p>DB admin user 설정과 운영 계정 seed를 먼저 완료한 뒤 다시 접속해 주세요.</p>
            </div>
          )}
        </Surface>
      </div>
    </main>
  );
}
