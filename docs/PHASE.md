# Mingle Phase Status

## Current Phase

Live State -> Flow transition

### Level 1 Focus (One Session Completion)

- 현재 배치는 단일 지점/단일 OPEN 세션 완주 품질 고정이 우선입니다.
- 범위: `QR -> 온보딩 -> 하트 -> 리빌 -> 연락처 교환 -> 신고 -> 종료`.
- CRM/예약/다지점은 구조만 유지하고 구현 확장은 보류합니다.
- 단, 예약은 외부 연동 없이 CSV 수동 업로드/내보내기 경로를 우선 제공합니다.

## Conservative Completion Baseline

- 코어 아이디어: 60%
- 기술 조각: 25%
- 실제 제품 완성도: 3~5%
- 운영 시스템 완성도: 1~3%
- 상용 UI/UX 완성도: 2~5%
- 사업 확장 준비: 5~10%

위 점수는 과대평가 금지 기준선이며, 내부 문서/커뮤니케이션에서 유지합니다.

## Admin Scope in This Batch

- Implement IA correction and role-based navigation only.
- Keep business logic and API contracts unchanged.
- Add read-only placeholders for:
  - 예약 현황
  - 전체 고객 DB (CRM readiness)
  - 지점 설정

## Explicit Non-goals

- No new backend APIs
- No reservation CRUD completion
- No global customer DB persistence completion
- No branch CRUD expansion

## Locked Rules Reminder

- One branch can have only one OPEN session at a time.
- HQ Admin sees all branches; Branch Admin sees own branch only.
- Session is under Branch; Live Ops is under Session.
- Client UI must remain server-authoritative in operational state.
