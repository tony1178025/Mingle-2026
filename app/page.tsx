import Link from "next/link";
import { Badge, Surface } from "@/components/shared/ui";
import { MingleLogo } from "@/components/brand/MingleLogo";
import { MingleIcon } from "@/components/brand/MingleIcon";

export default function HomePage() {
  return (
    <main className="portal-shell">
      <div className="portal-grid">
        <div className="portal-copy">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <MingleIcon variant="compact" size={48} />
            <MingleLogo variant="full" theme="dark" size="md" />
          </div>
          <h1 className="portal-title">현장 감정과 운영 판단을 동시에 잡는 테이블 경험 OS</h1>
          <p className="portal-description">
            고객에게는 깊고 세련된 만남의 흐름을, 운영팀에게는 회전과 공개를 한 화면에서 제어하는
            라이브 시스템을 제공합니다.
          </p>
          <div className="portal-actions">
            <Link href="/customer" className="button button-primary">
              고객 PWA 열기
            </Link>
            <Link href="/admin" className="button button-secondary">
              운영 콘솔 열기
            </Link>
          </div>
        </div>

        <Surface className="portal-panel">
          <div className="portal-panel-row">
            <Badge tone="accent">고객</Badge>
            <span>체크인부터 프로필, 테이블 탐색, 하트, 신고까지 모바일 흐름으로 이어집니다.</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="warning">운영</Badge>
            <span>열기, 위험 인원, 공개 토글, 회전 미리보기와 적용을 한 번에 처리합니다.</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="success">엔진</Badge>
            <span>A/B/C 티어, E/I 균형, 반복 만남 회피, 보호 배치를 기준으로 회전을 설계합니다.</span>
          </div>
        </Surface>
      </div>
    </main>
  );
}
