import Link from "next/link";
import { MINGLE_CONSTANTS } from "@/lib/mingle";
import { Badge, Surface } from "@/components/shared/ui";
import { MingleLogo } from "@/components/brand/MingleLogo";
import { MingleIcon } from "@/components/brand/MingleIcon";

export default function HomePage() {
  return (
    <main className="portal-shell">
      <div className="portal-grid">
        <div className="portal-copy">
          <p className="eyebrow">PREMIUM SOCIAL NIGHT</p>
          <div className="portal-brand-row">
            <MingleIcon variant="compact" size={48} />
            <MingleLogo variant="full" theme="dark" size="md" />
          </div>
          <h1 className="portal-title">오늘 밤, 가장 세련된 만남이 시작되는 파티</h1>
          <p className="portal-description">
            밍글은 현장 테이블 배치와 하트 교환, 프로필 탐색을 통해 자연스럽고 밀도 높은 만남을 연결하는
            프리미엄 오프라인 소셜 디스커버리 플랫폼입니다.
          </p>
          <div className="portal-meta-grid">
            <div className="portal-meta-card">
              <span className="hero-side-kicker">오늘 일정</span>
              <strong>{MINGLE_CONSTANTS.sessionDateLabel}</strong>
              <p>{MINGLE_CONSTANTS.sessionTimeLabel}</p>
            </div>
            <div className="portal-meta-card">
              <span className="hero-side-kicker">장소</span>
              <strong>{MINGLE_CONSTANTS.venueName}</strong>
              <p>{MINGLE_CONSTANTS.venueAddress}</p>
            </div>
            <div className="portal-meta-card">
              <span className="hero-side-kicker">참석 신호</span>
              <strong>{MINGLE_CONSTANTS.attendanceLabel}</strong>
              <p>{MINGLE_CONSTANTS.attendanceHint}</p>
            </div>
          </div>
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
            <span>체크인 뒤 시간과 장소, 참석 분위기를 먼저 보고 테이블 중심으로 자연스럽게 사람을 읽습니다.</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="warning">운영</Badge>
            <span>시간, 장소, 체크인 흐름, 열기, 공개 토글, 회전 적용 여부를 몇 초 안에 판단할 수 있게 설계했습니다.</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="success">엔진</Badge>
            <span>A/B/C 티어, E/I 균형, 반복 만남 회피, 보호 배치를 기준으로 구조적인 회전을 설계합니다.</span>
          </div>
        </Surface>
      </div>
    </main>
  );
}
