# QA Checklist

## Mandatory Validation Loop

Run all:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

If any fails:
- identify failing file/test
- apply fix
- rerun from lint

## E2E Deterministic Bootstrap Checks

- [ ] `E2E_SEED_ENABLED=true`에서 `/api/test/e2e/bootstrap` 호출이 200으로 성공한다.
- [ ] `E2E_SEED_ENABLED=false` 또는 production 환경에서는 bootstrap endpoint가 차단된다.
- [ ] bootstrap 결과에 admin 로그인 정보/QR URL/세션 식별자가 기록된다.
- [ ] bootstrap 이후 세션 phase는 `ROUND_1`, lifecycleStatus는 `OPEN`으로 고정된다.
- [ ] bootstrap 이후 최소 2개 table QR가 `ACTIVE` 상태로 존재한다.
- [x] bootstrap 기반 타깃 E2E는 skip 없이 pass/fail로 판정된다.
- [ ] `tests/e2e/customer-checkin.spec.ts`의 valid QR 온보딩 경로는 `"입장 확인 중"` 상태를 벗어나 닉네임 입력으로 진입한다.
- [ ] `tests/e2e/admin-live-ops.spec.ts`는 브랜치 기본 랜딩(`지점 대시보드`)에서 라이브 콘솔 전환 후 패널 smoke를 통과한다.

## Customer PWA Checks (Korean-first, mobile-first)

- [ ] QR check-in succeeds with valid code
- [ ] invalid/revoked/expired/disabled QR is blocked with clear message
- [ ] duplicate participant creation is blocked
- [ ] profile onboarding completes and session cookie is issued
- [ ] participant list loads and tableLabel rendering is stable
- [ ] heart send flow works and failure messages are clear
- [ ] report submission works and appears in admin reports

## Admin Checks (clean, bright, low-complexity)

- [ ] session lifecycle controls work (ROUND_1/BREAK/ROUND_2/CLOSED)
- [ ] dangerous actions require confirm
- [ ] QR regenerate updates active code and revokes prior active code
- [ ] content panel controls do not break customer state sync
- [ ] reports panel resolve/block flows work
- [ ] audit logs are recorded for major mutations

## Safety Gate Checks (high-impact)

### DB Migration
- [ ] migration reviewed
- [ ] rollback available
- [ ] backup command documented
- [ ] no destructive SQL without explicit marker

### Deployment
- [ ] lint pass
- [ ] typecheck pass
- [ ] tests pass
- [ ] build pass
- [ ] target env confirmed

### External API
- [ ] no secrets in git
- [ ] env validation added
- [ ] sandbox test evidence

### Data Deletion
- [ ] affected rows preview
- [ ] backup command
- [ ] audit trail note
