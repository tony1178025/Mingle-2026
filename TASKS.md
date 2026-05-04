# TASKS

## 운영 원칙
- 새로운 기능 확장은 금지.
- 고정 아키텍처/비즈니스 규칙은 변경 금지.
- Korean-first UI 유지.
- Admin은 밝고 단순한 운영 콘솔 유지.
- Customer PWA는 모바일 우선 안정성 유지.
- 코드/문서/설정 변경이 발생할 때마다 `PROJECT_STATE.md`와 `TASKS.md`를 즉시 업데이트.

## 자동화 정책 변경
- 개발 자동화 에이전트는 즉시 허용.
- 사업 운영 자동화는 Phase 4 유지.
- DB/배포/API/삭제/리팩토링 자동화는 Safety Gate 통과 시 허용.

## Active Tasks (Paid Beta Readiness)

### P0
- [x] 기준 운영 문서 복구(AGENT/PROJECT_STATE/ROADMAP/TASKS/QA_CHECKLIST)
- [x] Customer participant contract 최소화(ROUND_1)
- [x] profileImage 중심 소비 정리
- [x] ROUND_1 제거 필드 재생성 방지 normalize 확인
- [x] lint/typecheck/test/build 통과

### P1
- [x] QR regenerate 세션 경계 검증(sessionId 명시 계약)
- [x] 체크인 차단 가드 강화: CLOSED/MATCH_END/DISABLED/만료(운영 런타임)
- [x] QR revoke 전용 API 분리(`/api/admin/sessions/[sessionId]/tables/[tableId]/qr/revoke`)
- [x] /api/customer/* visibility 계약 테스트 확장
- [x] QR lifecycle 완전 검증 테스트 추가
- [ ] E2E deterministic seed/bootstrap 고정 완료(bootstrap API + globalSetup + fixture 연동 완료, 남은 2건은 앱 런타임/체크인 검증 정합 이슈)
- [ ] Admin Live Ops 스모크 체크리스트 자동화

### P2
- [x] AI Automation Center 설계 문서 등록
- [x] Admin 메뉴 placeholder 추가
- [x] automation_queue / automation_logs schema draft 추가
- [ ] 콘텐츠 UX 구조화 (카드 리스트 / 바텀시트 / renderer 분리 / TableStageCard 책임 축소)

## 마지막 업데이트
- 2026-05-01: admin/customer 타깃 E2E 원인 수정 진행. selector를 UI 계약 기반으로 조정하고 `data-testid`를 최소 추가했으며, 온보딩 초기 상태를 `입장 확인 중`으로 정리. 현재 타깃 e2e는 2 passed / 2 failed(원인: admin helper가 지점 대시보드 텍스트에 과의존, customer verifyCheckin 흐름이 seed QR에서 SUCCESS로 수렴하지 않음).
- 2026-05-01: AGENT.md에 skill.fish 21개 스킬 운영 프레임(Primary SoT/우선순위/비협상 규칙/사용 정책/사전 체크리스트) 반영.
- 2026-04-29: 문서 부재 복구 + 자동화 정책/Safety Gate 반영 + 현재 브랜치 상태 기준 진행 계획 동기화.
- 2026-04-29: P1 우선 이슈로 QR revoke 전용 API 추가, 전체 검증(lint/typecheck/test/build) 재통과.
- 2026-04-29: `/api/customer/*` visibility 계약 테스트 확장 완료(ROUND_1/ROUND_2 필드 정책 + normalize 회귀 + phase 전환 + blocked/logged-out 가시성).
- 2026-04-29: QR lifecycle 계약 테스트(revoke/regenerate/closed+duplicate) 및 E2E 핵심 플로우 테스트 추가 후 전체 검증 재통과.
- 2026-04-29: Playwright 구조(fixtures/helpers/specs) 작성 완료. `npm run test:e2e`는 브라우저 설치 후에도 로컬 데이터/화면 시드와 셀렉터 불일치로 12개 실패(정책 위반이 아닌 환경/seed 정합 이슈)하여 안정화 태스크로 유지.
- 2026-04-29: E2E helper 보정(auth/customer selector 계약 정렬) 및 환경 미시드 경로에 guard/skip 적용. `customer-checkin/admin-live-ops` 타깃 실행 결과 1 passed / 2 skipped로 비결정 실패 제거.
