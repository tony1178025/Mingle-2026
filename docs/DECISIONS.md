# Mingle-2026 Decisions

## 2026-04-26 - Paid Beta Visual System Refresh

### Decision

Adopt a coherent cross-surface visual system by prioritizing design tokens and shared UI classes over screen-by-screen custom styling.

### Why

- Customer and Admin had mixed visual tone, making the product feel unfinished.
- Repeated ad-hoc styles reduced trust and readability in operations.
- Paid beta requires stable polish without risking runtime behavior.

### What changed

- Rebalanced core color tokens toward calm navy + muted violet.
- Unified card, button, form, badge, and compact-row treatment.
- Reduced decorative noise and random high-contrast accents.
- Replaced key inline styles in Customer/Admin views with named classes.
- Removed English-only eyebrow labels in customer flow where possible.

### Trade-offs

- Kept current component structure and interaction flows intact.
- Did not introduce new design libraries or animation systems.
- Some legacy component-level spacing/styling remains as follow-up debt.

### Follow-up

- Continue converting remaining inline style usage in admin subpanels.
- Normalize section header density and empty-state treatment in all admin panels.
- Align remaining docs/screens to Korean-first operational copy rules.

## 2026-04-26 - Admin IA Role Hierarchy Refactor

### Decision

Refactor Admin dashboard navigation and page composition into role-based hierarchy:
HQ/Admin scopes and Branch operational scopes are explicitly separated.

### Why

- Existing admin felt flat and panel-first instead of operation-first.
- Branch/Session/Live boundaries were ambiguous in sidebar and context.
- Future 예약/고객 DB modules had no stable IA home.

### What changed

- Sidebar now renders hierarchy tree:
  - HQ: 본부 대시보드 / 전체 고객 DB / 관리자 관리
  - Branch node: 지점 대시보드 / 예약 현황 / 세션 / 라이브 콘솔 / 참가자·고객 / 지점 설정
- Context bar follows page scope:
  - HQ pages: compact "본부" context
  - Branch pages: 본부 > 지점 > 회차 > 현재 페이지
- Added read-only CRM-oriented customer DB structure with recommendation/popularity placeholders.
- Centralized admin default-config surface in `lib/mingle.ts` for scattered constants.

### Trade-offs

- Branch list currently derives from available session snapshot branch context in this phase.
- Reservation/customer DB remain read-only placeholders until runtime-contract/live-state expansion.

## 2026-04-26 - Admin-Customer Exposure Boundary

### Decision

Split snapshot sanitization policy by consumer:

- Admin view: 운영 데이터 유지
- Customer view: customer-safe projection only

### Why

- Admin와 Customer가 동일 세션 상태를 공유하더라도 노출 범위는 동일하면 안 됩니다.
- 고객에게 내부 판단/리스크/운영 메모가 노출될 수 있는 구조는 제품 원칙 위반입니다.

### What changed

- API 레벨에서 Admin/Customer snapshot sanitization 분기 도입.
- Customer 응답에서 운영 내부 배열(`reports`, `incidents`, `auditLogs`, `blacklist`) 차단.
- Customer participant payload의 예약/연락처/내부 등급성 필드 마스킹.

### Trade-offs

- 현재는 동일 `SessionSnapshot` 타입 위에서 값 마스킹 방식으로 동작합니다.
- 장기적으로는 Customer 전용 DTO 타입으로 완전 분리해야 합니다.

## 2026-04-26 - Independent Manual Ops MVP

### Decision

외부 연동이 없어도 운영 가능한 독립 실행형 MVP를 우선 기준으로 고정한다.

### Why

- 네이버/스토리지/SMS 연동 지연이 있어도 현장 운영은 멈추면 안 된다.
- 현재 단계 목표는 다지점 확장이 아니라 한 회차 완주 신뢰성 확보다.

### What changed

- Admin 예약 현황에 CSV 수동 업로드/검증/중복 전화 감지 구조를 추가했다.
- 예약/체크인/연락처 공유/노쇼 데이터를 CSV로 내보내는 운영 보조 경로를 추가했다.
- 프로필 사진은 미업로드/실패 시 성별 기본 아바타(미확인 포함 기본 이미지)로 정규화한다.

### Trade-offs

- XLSX는 준비중 상태로 명시하고 CSV를 우선 지원한다.
- 예약 저장 영속화는 별도 배치로 분리하고 현재는 운영 검증/미리보기 중심이다.

