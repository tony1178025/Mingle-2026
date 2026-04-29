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
- [ ] /api/customer/* visibility 계약 테스트 확장
- [ ] Admin Live Ops 스모크 체크리스트 자동화

### P2
- [x] AI Automation Center 설계 문서 등록
- [x] Admin 메뉴 placeholder 추가
- [x] automation_queue / automation_logs schema draft 추가
- [ ] 콘텐츠 UX 구조화 (카드 리스트 / 바텀시트 / renderer 분리 / TableStageCard 책임 축소)

## 마지막 업데이트
- 2026-04-29: 문서 부재 복구 + 자동화 정책/Safety Gate 반영 + 현재 브랜치 상태 기준 진행 계획 동기화.
- 2026-04-29: P1 우선 이슈로 QR revoke 전용 API 추가, 전체 검증(lint/typecheck/test/build) 재통과.
