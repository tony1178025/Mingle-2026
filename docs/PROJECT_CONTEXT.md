# Mingle-2026 Project Context

## Visual System Context (Paid Beta)

Mingle-2026 is an offline event operations system with two product faces:

- Customer PWA: mobile-first, calm, focused, reassuring
- Admin Console: operator-first, readable, fast decision support

The paid beta visual baseline is:

- premium but restrained
- no flashy gradients or decorative clutter
- consistent component language across customer/admin
- clear Korean hierarchy for titles, guidance, and status

## Visual Rules

- One palette with stable semantics:
  - dark shell for app context
  - clean surface contrast
  - muted violet-blue as primary
  - soft pink/amber only as highlight
  - standardized success/warning/danger
- Inputs/buttons/cards/badges must follow shared system classes.
- Inline style overrides should be minimized in feature components.
- Sticky status and operational feedback must look intentional, not temporary.

## Admin Information Architecture (Locked)

- Hierarchy is fixed: 본부 → 지점 → 회차 → 라이브 콘솔
- Role scope:
  - HQ Admin: all branches, all sessions, org-level customer/admin views
  - Branch Admin: own branch only, no HQ/global admin menus
- One branch can have only one OPEN session at the same time.
- Live Ops is always nested under Session, and Session under Branch.
- Branch nodes must be data-driven from current branch/session data (no hardcoded branch names).

## Customer DB Readiness Layer

- Current phase keeps customer DB as read-only operational structure.
- Show internal-only CRM signals (not customer-facing):
  - 받은 하트, 매칭, 연락처 공유, 방문, 신고/제재
  - 인기도 지표 (누적 데이터 준비 문구 포함)
  - 스태프 추천 레이어(S/A/B/C, 태그, 메모) placeholder
- Avoid public ranking tone; use "운영 참고" wording.

## Admin-Customer Synchronization Principle

- Admin Dashboard and Customer PWA share one server-authoritative session state.
- Same state, different exposure:
  - Admin: 운영 제어/감시/CRM/리스크
  - Customer: 참여/선택/신고/개인 설정
- Customer must never see admin-internal fields:
  - 운영 메모, 추천 등급/태그, 리스크 등급, 블랙리스트 사유, 감사 로그
- Any admin state change must appear in customer flow immediately.
- Any customer action must appear in admin operations view immediately.

## Non-goals

- No business logic change
- No backend/API additions
- No animation-heavy redesign
- No feature deletion

## Independent MVP Operation Principle

- 외부 연동(네이버 예약, 업로드 스토리지, 문자 자동화)은 옵션으로 취급합니다.
- 외부 연동이 없어도 한 지점/한 회차를 유료 운영할 수 있어야 합니다.
- 필수 경로:
  - 예약 CSV 수동 업로드/검증
  - QR 입장 -> 온보딩 -> 하트 -> 리빌 -> 연락처 공유 -> 신고 -> 종료
  - 운영 결과 CSV 내보내기
- 사진 업로드 실패/미구성 시 기본 아바타로 즉시 대체합니다.

