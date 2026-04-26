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
          <p className="eyebrow">Mingle · 밍글</p>
          <div className="portal-brand-row">
            <MingleIcon variant="compact" size={48} />
            <MingleLogo variant="full" theme="dark" size="md" />
          </div>
          <h1 className="portal-title">낯설지 않게, 자연스럽게</h1>
          <p className="portal-description">
            Mingle은 처음 만난 사람들이 편하게 대화하고 서로를 알아갈 수 있도록 흐름이 설계된 오프라인
            소셜 모임입니다.
          </p>
          <div className="portal-meta-grid">
            <div className="portal-meta-card">
              <span className="hero-side-kicker">참여 흐름</span>
              <strong>{MINGLE_CONSTANTS.sessionDateLabel}</strong>
              <p>예약 후 현장에서 QR로 입장해요</p>
            </div>
            <div className="portal-meta-card">
              <span className="hero-side-kicker">진행 방식</span>
              <strong>{MINGLE_CONSTANTS.venueName}</strong>
              <p>라운드 대화 뒤 마음에 드는 사람에게 하트를 보내요</p>
            </div>
            <div className="portal-meta-card">
              <span className="hero-side-kicker">안전 원칙</span>
              <strong>서로 동의하면 연락처가 공개됩니다</strong>
              <p>불편한 상황은 앱에서 바로 신고할 수 있어요</p>
            </div>
          </div>
          <div className="portal-actions">
            <Link href="/customer" className="button button-primary">
              참여 일정 보기
            </Link>
            <Link href="/admin" className="button button-secondary">
              지금 예약하기
            </Link>
          </div>
        </div>

        <Surface className="portal-panel">
          <div className="portal-panel-row">
            <Badge tone="accent">문제 공감</Badge>
            <span>새로운 사람을 만나는 자리는 늘 조금 어색합니다. 밍글은 그 어색함을 줄여줘요.</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="warning">참여 흐름</Badge>
            <span>원하는 일정 예약 → 현장 입장 → QR 프로필 입력 → 라운드 대화 → 하트 → 연락처 공유</span>
          </div>
          <div className="portal-panel-row">
            <Badge tone="success">FAQ</Badge>
            <span>혼자 와도 괜찮고, 사진은 선택사항입니다. 기본 이미지로도 참여할 수 있어요.</span>
          </div>
        </Surface>
      </div>
    </main>
  );
}
