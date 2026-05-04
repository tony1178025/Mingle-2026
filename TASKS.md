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
- [x] API JSON 봉투 일관화(빈 body 금지, catch에서 항상 JSON)

### P1
- [x] QR regenerate 세션 경계 검증(sessionId 명시 계약)
- [x] 체크인 차단 가드 강화: CLOSED/MATCH_END/DISABLED/만료(운영 런타임)
- [x] QR revoke 전용 API 분리(`/api/admin/sessions/[sessionId]/tables/[tableId]/qr/revoke`)
- [x] /api/customer/* visibility 계약 테스트 확장
- [x] QR lifecycle 완전 검증 테스트 추가(단위)
- [x] Admin Live Ops E2E 스모크(`admin-live-ops.spec.ts`) — 시드 켠 상태에서 통과(Playwright 별도 프로세스 + 시드 파일 기반 admin store)
- [ ] **Customer check-in E2E**(`customer-checkin.spec.ts`): 알려진 플래키. **하루 이상 소모 금지**(`DECISIONS.md` §11). 앱 회귀는 lint/unit/integration + 수동 온보딩으로 보완.
- [ ] Admin Live Ops 스모크 체크리스트 자동화(추가 시나리오)

### P2 (완성도 / UX, 구조 변경 최소)
- [x] AI Automation Center 설계 문서 등록
- [x] Admin 메뉴 placeholder 추가
- [x] automation_queue / automation_logs schema draft 추가
- [x] 테이블 탭 vs 콘텐츠 탭: 라이브 미션 카드 역할 분리(`TableStageCard` compact/full)
- [ ] 콘텐츠 UX 추가 구조화(카드 리스트 / 바텀시트 / renderer 분리 / TableStageCard 내부 단계적 분리)

## 마지막 업데이트
- 2026-05-04: 1주 마감 기준 **결과물 완성도** 우선. customer-checkin E2E는 Known flaky로 문서화하고 추적 중단. Customer/Admin 최소 UI·카피·QR 카드(폐기 버튼) 정리, `PROJECT_STATE`/`QA_CHECKLIST`/`DECISIONS` 반영.
- 2026-05-01: admin/customer 타깃 E2E 원인 수정 진행. selector를 UI 계약 기반으로 조정하고 `data-testid`를 최소 추가했으며, 온보딩 초기 상태를 `입장 확인 중`으로 정리.
- 2026-05-01: AGENT.md에 skill.fish 21개 스킬 운영 프레임 반영.
- 2026-04-29: 문서 부재 복구 + 자동화 정책/Safety Gate 반영 + 진행 계획 동기화.
