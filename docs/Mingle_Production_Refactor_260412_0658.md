# Mingle Production Refactor 260412_0658

작성일시: 2026-04-12 06:58

## 반영 범위
- Rotation 엔진 실제 연결: users → seating_assignments → preview → apply
- 테이블 기반 고객 탐색 UI 재설계
- Zustand slices 상태관리 구조 재작성
- customer / admin / games / engine / shared 컴포넌트 분리
- reveal sender 조건에 어드민 토글 반영
- Supabase DB 스키마 기준 타입 재정렬
- polling 기반 실시간 동기화
- next/image 적용 구조
- 프로필/테이블 카드 모션 토큰화
- 어드민 Heat 시각화 강화
- rotation preview before/after 비교 UI
- audit log UI 및 action history 연결
- QR + 코드 + staff fallback 체크인 3단계 구조
- Playwright E2E + 최소 단위 테스트 추가

## 최종 판단
이 파일 세트는 아이디어 메모가 아니라, 실제 Next.js/React 프로젝트로 옮길 수 있는 프로덕션 지향 코드 골격이다.
다만 현재는 외부 연동(Supabase, QR scanner, realtime backend) 없이도 동작 가능한 mock-first 구조로 정리했다.

## 핵심 구조
- app/App.jsx: 앱 엔트리
- stores/useSessionStore.js: 세션/유저/로테이션/공개 상태
- engine/rotationEngine.js: preview/apply 가능한 배치 엔진
- components/customer/*: 고객용 화면
- components/admin/*: 운영 대시보드
- components/shared/*: 공통 카드/버튼/배지
- types/schema.js: Supabase 기준 데이터 타입 주석/shape
- lib/realtime.js: polling 구조
- tests/unit/rotationEngine.test.js: 단위 테스트
- tests/e2e/customer-flow.spec.js: E2E 시나리오

## 크로스체크 결과
### 반드시 반영된 것
- reveal sender = ROUND_2 + admin toggle + usedFreeHearts >= 3
- 고객 탐색 = 플랫 리스트 제거, 테이블 중심
- 로컬 랜덤 더미 = 초기 fixture로만 사용, 상태 핵심 아님
- 한 파일 구조 제거
- MBTI 확장 제거, E/I만 유지

### 추가로 새 반영한 것
- seating preview diff 구조
- heat 상태 색 분기
- audit logs
- risk user recommend action
- check-in fallback mode (qr/code/staff)

## 아직 외부 연동이 필요한 것
- 실제 Supabase CRUD
- Supabase Realtime 또는 websocket
- QR scanner SDK
- 이미지 CDN/S3/R2
- auth/admin role guard
