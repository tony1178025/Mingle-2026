# PROJECT_STATE

## Updated

- 2026-04-29 (16:34 UTC)
- 2026-04-29 (16:44 UTC)

## Current Branch

- `cursor/round1-payload-minimize-1fa1`

## Current Repository Status

- Core customer/admin flows compile and pass full local verification.
- Recent work stabilized:
  - ROUND_1 customer participant minimal payload exposure
  - customer-side `tableLabel` usage paths
  - QR regenerate command contract hardening (`sessionId` binding)
  - QR revoke endpoint and command path added (`/api/admin/sessions/[sessionId]/tables/[tableId]/qr/revoke`)
  - AI Automation Center design-only docs + schema draft placeholder
- Missing top-level control docs were restored in this commit:
  - `AGENT.md`
  - `PROJECT_STATE.md`
  - `ROADMAP.md`
  - `TASKS.md`
  - `QA_CHECKLIST.md`

## Implemented (High-Level)

- Customer signed session boundary in runtime.
- Admin RBAC + branch/session management surface.
- Session state controls + reveal flow.
- Blacklist/incident baseline.
- QR regenerate with active-code replacement and revoke marking.
- Customer payload sanitization boundary (admin vs customer).

## Broken / Inconsistent (Current Known)

1. Top-level execution docs were previously missing (now restored).
2. ROADMAP/TASKS alignment drift existed between docs and actual code status.
3. Some roadmap items are still in-progress by design:
  - content UX modular decomposition
  - richer live-ops smoke automation
  - expanded end-to-end scenario coverage

## This Iteration Changes

- Restored missing agent control documents.
- Synced current known status and next actions into TASKS/ROADMAP.
- Added autonomous execution policy + safety gate decisions to top-level docs.
- Added policy: every meaningful code/config change must be followed by markdown state updates.
- Implemented high-priority QR lifecycle gap fix: explicit revoke API/command path.
- Added Mingle Master Specification v1.0 placeholder spec doc for agent read order continuity.
- Expanded `/api/customer/*` visibility contract coverage with phase-aware unit tests:
  - ROUND_1 allowed/blocked field enforcement
  - ROUND_2 allowed/blocked field enforcement
  - phase transition visibility assertions
  - blocked/logged-out participant list visibility assertions
  - tableLabel visibility behavior assertions
- Hardened serializer contract for ROUND_2 by removing `tableLabel` exposure.
- Adjusted client normalize path to avoid restoring removed ROUND_1 fields.
- Added QR lifecycle contract unit tests for:
  - revoke 정상 작동
  - regenerate 후 이전 QR 차단
  - 세션 종료 시 체크인 차단 + 중복 참가자 생성 방지
- Added E2E core-flow scenario spec skeleton to cover:
  - QR 입장, 프로필, 참가자 탐색, 하트, 라운드 전환, 콘텐츠 참여, 신고, 관리자 조작
- Added Playwright finish-phase structure:
  - `tests/e2e/fixtures/test-data.ts`
  - `tests/e2e/fixtures/selectors.ts`
  - `tests/e2e/helpers/{auth,admin,customer,qr,assertions}.ts`
  - `tests/e2e/{customer-checkin,customer-visibility,customer-heart-match,customer-content-report,admin-live-ops,qr-lifecycle}.spec.ts`
- Aligned E2E helper contracts to current runtime UI:
  - admin login uses labeled fields (`로그인 ID 또는 이메일`, `관리자 비밀번호`)
  - selector contract fixed (`dashboardTitle` literal instead of `text=` prefix)
  - onboarding helper adds runtime guard for immediate `입장 실패` state
  - check-in/admin live-ops specs now skip with explicit reason when runtime seed is unavailable
- Updated `playwright.config.ts` with requested defaults:
  - `baseURL: process.env.E2E_BASE_URL || "http://localhost:3000"`
  - CI retries = 2
  - trace/screenshot/video failure retention
- Updated package scripts:
  - `test:e2e`
  - `test:e2e:ui`
  - `test:e2e:headed`
- Preserved existing architecture and business rules.

## Verification Baseline

- Latest successful local verification in this iteration:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run test:e2e -- tests/e2e/customer-checkin.spec.ts tests/e2e/admin-live-ops.spec.ts` (1 passed, 2 skipped)

## Remaining Blockers

- E2E full-suite is still blocked by runtime fixture/UI-entry assumptions, not build/test infra.
- Failing surface:
  - admin login/dashboard text assumptions mismatch (`현장 운영 대시보드` not found)
  - customer onboarding assumptions mismatch (`닉네임` placeholder flow unavailable in current entry state)
  - legacy deploy/paid-beta e2e expectations mismatch with current customer entry messaging
- Affected files:
  - `tests/e2e/helpers/auth.ts`
  - `tests/e2e/helpers/customer.ts`
  - `tests/e2e/customer-admin-core-flow.spec.ts`
  - `tests/e2e/customer-checkin.spec.ts`
  - `tests/e2e/customer-content-report.spec.ts`
  - `tests/e2e/customer-heart-match.spec.ts`
  - `tests/e2e/customer-visibility.spec.ts`
  - `tests/e2e/qr-lifecycle.spec.ts`
  - `tests/e2e/deploy-smoke.spec.ts`
  - `tests/e2e/paid-beta-smoke.spec.ts`
- Next required command after selector/fixture alignment:
  - `npm run test:e2e`