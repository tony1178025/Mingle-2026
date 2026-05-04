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

## Known flaky (do not block release on this alone)

- [ ] `tests/e2e/customer-checkin.spec.ts` — Playwright에서 간헐 타임아웃·`Target page/context/browser has been closed` 등. **앱 단독 결함으로 단정하지 않음.** 수동으로 QR→온보딩 1~5→입장 경로를 확인할 것 (`DECISIONS.md` §11).

## E2E Deterministic Bootstrap Checks

- [ ] `E2E_SEED_ENABLED=true`에서 `/api/test/e2e/bootstrap` 호출이 200으로 성공한다.
- [ ] `E2E_SEED_ENABLED=false` 또는 production 환경에서는 bootstrap endpoint가 차단된다.
- [ ] bootstrap 결과에 admin 로그인 정보/QR URL/세션 식별자가 기록된다.
- [ ] bootstrap 이후 세션 phase는 `ROUND_1`, lifecycleStatus는 `OPEN`으로 고정된다.
- [ ] bootstrap 이후 최소 2개 table QR가 `ACTIVE` 상태로 존재한다.
- [x] bootstrap 기반 타깃 E2E는 skip 없이 pass/fail로 판정된다.
- [ ] `tests/e2e/admin-live-ops.spec.ts`는 브랜치 기본 랜딩에서 라이브 콘솔 전환 후 패널 smoke를 통과한다.

## Customer PWA Checks (Korean-first, mobile-first)

- [ ] QR check-in succeeds with valid code
- [ ] invalid/revoked/expired/disabled QR is blocked with clear message
- [ ] duplicate participant creation is blocked
- [ ] profile onboarding completes and session cookie is issued
- [ ] 참가자 탭: 목록·필터·페이지네이션·상세 시트 가독성
- [ ] 테이블 탭: 같은 테이블 멤버 + **미션 요약**(실제 제출은 콘텐츠 탭)
- [ ] 콘텐츠 탭: 라이브 미션(공지/유도/투표/익명/테이블 픽) 참여·하트·공개 흐름
- [ ] 설정 탭: 프로필 저장, 2차 참석, 신고 제출
- [ ] heart send flow works and failure messages are clear
- [ ] report submission works and appears in admin reports

## QR lifecycle (manual, per session/table)

수동으로 확인하고 이슈 시 기록:

- [ ] **재생성**: 관리자 QR 재생성 후 활성 코드만 유효
- [ ] **폐기**: `QR 폐기` 후 해당 테이블 체크인 불가(새 QR 발급 전)
- [ ] **구코드 차단**: 재생성 전 스캔했던 URL/코드로는 더 이상 입장 불가
- [ ] **활성 허용**: 현재 활성 코드로만 정상 체크인
- [ ] **세션 종료 후**: 세션 `CLOSED` 등 종료 상태에서 체크인 차단

자동 근거: `tests/unit/qr-lifecycle-contract.test.ts`, `tests/unit/checkin-state.test.ts`

## Admin Checks (clean, bright, low-complexity)

- [ ] session lifecycle controls work (ROUND_1/BREAK/ROUND_2/CLOSED)
- [ ] dangerous actions require confirm
- [ ] QR regenerate updates active code and revokes prior active code
- [ ] QR revoke(폐기) clears active check-in until regenerate
- [ ] content panel controls do not break customer state sync
- [ ] reports panel resolve/block flows work
- [ ] audit logs are recorded for major mutations
- [ ] 라이브 콘솔: 로딩·스냅샷 없음·주의 패널 문구가 3초 안에 스캔 가능한지

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
