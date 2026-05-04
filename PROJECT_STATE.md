# PROJECT_STATE

## Updated

- 2026-05-04 (completeness pass: customer/admin UI copy, content tab split, docs)

## Current Branch

- `cursor/completeness-ui-docs-1fa1` (작업 브랜치; 기준은 `cursor/round1-payload-minimize-1fa1`)

## Current Repository Status

- **품질 게이트**: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — 마지막 작업 기준으로 통과 목표.
- **API**: 고객/관리자 라우트는 `jsonOk` / `jsonError` JSON 봉투로 응답. `GET /api/session/events`는 `Accept: application/json`일 때 핸드셰이크 JSON.
- **E2E**: `tests/e2e/admin-live-ops.spec.ts` — 시드 켜고 재확인 권장. `tests/e2e/customer-checkin.spec.ts` — **알려진 플래키**(Playwright 타임아웃·컨텍스트 종료); 앱 로직 최우선 수정 대상 아님(`DECISIONS.md` §11).

## This Iteration Changes (2026-05-04)

- **Customer PWA**: 탭 라벨 정리(참가자 / 테이블 / 콘텐츠 / 설정), 토스트 제목 한글화, QR·스냅샷 오류 문구 다듬음, 메인 히어로·참가자 섹션 카피 정리.
- **테이블 vs 콘텐츠**: `TableStageCard`에 `layout="compact" | "full"` — 테이블 탭은 미션 요약만, 실제 입력·제출은 콘텐츠 탭으로 집중.
- **Admin**: 초기 로딩에 `EmptyState` + 스켈레톤, 스냅샷 없을 때 안내 문구 보강, 라이브 패널 제목·지표 힌트 스캔용 정리, `LiveOpsControls`에 현재 단계 배지.
- **QR 운영**: `SessionQrCard`에 **QR 폐기** 버튼(기존 revoke API 호출), 재생성 확인 문구 명확화.
- **접근성**: 참가자 상세 시트에 `role="dialog"` 및 `aria-labelledby` 부여.
- **문서**: `TASKS.md`, `QA_CHECKLIST.md`, `DECISIONS.md` 동기화.

## Known Issues

1. **`customer-checkin` Playwright**: 환경·긴 온보딩 흐름에서 간헐 실패·행 걸림 가능. **Known flaky** — 별도 결정(`DECISIONS.md` §11)까지 우선순위 낮춤.
2. **전체 E2E 스위트**: 레거시 deploy/paid-beta 등 기대값 불일치 가능 — 본 이터레이션에서 범위 밖으로 유지.

## Verification Baseline

- 권장 루프: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`
- E2E(시드): `E2E_SEED_ENABLED=true npm run test:e2e -- --workers=1 tests/e2e/admin-live-ops.spec.ts` — **통과**(Playwright `webServer` 프로세스에서도 관리자 스토어가 `tests/e2e/.state/e2e-seed.json`으로 준비되도록 `getAdminUserStore()` 보강)

## Next Actions

- 현장 전 **수동 QA**: QR 재생성·폐기·구코드 차단·활성 허용·세션 종료 후 차단 (`QA_CHECKLIST.md`).
- 콘텐츠 UX: 카드/시트 추가 분리는 P2로 점진 적용.
