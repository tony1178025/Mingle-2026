# Mingle-2026 Conservative System Audit

## 1) Brutally Honest Completion Score

- 기능 조각: 있음
- 제품 완성도: 3~5%
- 사업 운영 시스템 완성도: 1~3%
- 상용 SaaS 관점: 초기 프로토타입

핵심 평가는 "기능 개수"가 아니라 아래 6개 축입니다.

- 상태 모델
- 역할별 정보 노출
- 화면별 책임
- 동기화
- 권한
- 데이터 흐름

## 1-1) Direction Correction

### Overbuilt

- 외부 연동이 없는 단계에서 시각 개선을 과도하게 앞당긴 부분
- 운영 안정성보다 표현/UI 밀도를 우선한 일부 화면

### Underbuilt

- 예약 수동 업로드/내보내기의 실운영 경로(적용/영속화 전에는 미리보기 중심)
- 고급 ROUND_2 좌석 추천 엔진(운영 안정성 중심)
- 외부 의존 실패 시 fallback 운영 정책 문서화

### Corrected now

- Level 1을 외부 연동 없는 독립 MVP 기준으로 재정의
- 예약은 네이버 API가 아닌 CSV 기반 대응 우선
- 업로드 실패 시 기본 아바타 fallback 고정
- 회전 엔진을 "매칭"이 아닌 "테이블 품질/운영 안정성" 방향으로 정렬
- 예약 적용 시 세션 스냅샷 영속화, 중복 import 방지(idempotent) 경로를 우선 연결
- 회전 적용 결과가 `tableId / seatingAssignments / auditLogs / version`에 반영되는지 검증 경로 추가

## 2) Admin ↔ Customer Sync Matrix

| Admin Page | Read Fields (Snapshot) | Commands | Customer Impact | Customer Hidden |
|---|---|---|---|---|
| 본부 대시보드 | `session`, `participants`, `hearts`, `reports`, `blacklist`, `auditLogs` | 없음(요약) | 직접 노출 없음 | 전체 운영 지표 |
| 전체 고객 DB | `participants`, `contactExchanges`, `reports`, `blacklist` | (현재 read-only) | 직접 노출 없음 | 인기도/추천/메모/리스크 |
| 관리자 관리 | admin user store | 관리자 계정 명령 | 직접 영향 없음 | 계정 권한/보안 정보 |
| 지점 대시보드 | `session`, `participants`, `reports`, `blacklist` | 없음(요약) | 현재 지점 상태 정보 간접 영향 | 운영 메모/리스크 분류 |
| 예약 현황 | (placeholder contract) | 없음(현재) | 체크인 준비 동선 영향 | 예약 인텔리전스 전체 |
| 고객 현황 | `participants`, `reports`, `blacklist`, `contactExchanges` | 차단/해제 | 차단/제한 즉시 반영 | 블랙리스트 사유/내부 메모 |
| 회차 현황 | `session`, `participants`, `contactExchangeStats` | 라이브 콘솔 이동 | 현재 라운드/진행에 직접 연결 | 내부 KPI |
| 라이브 콘솔 | `session.phase`, `liveContent`, `participants`, `table summaries`, `reports`, `hearts` | `admin.setSessionState`, `admin.triggerReveal`, `admin.publishAnnouncement`, 이동/차단/수동등록 | 라운드/리빌/공지/참가자 상태 즉시 반영 | 운영 개입 근거 데이터 |
| 참가자 관리 | `participants`, `participantStatusMap`, `blacklist` | 이동/차단/하트지급 | 테이블/노출/행동 제한 반영 | 내부 상태 판정 근거 |
| 콘텐츠 관리 | `liveContent`, `activeContentIds` | `admin.activateContent`, `admin.clearContent` | 고객 콘텐츠 카드 즉시 반영 | 템플릿 운영 메모 |
| 신고/제재 | `reports`, `incidents`, `blacklist` | `admin.resolveReport`, `admin.setBlacklistStatus` | 신고 처리/차단 상태 반영 | 사건 로그 세부/제재 사유 |
| 지점 설정 | `MINGLE_CONSTANTS`, `ADMIN_DEFAULT_CONFIG` | 없음(현재) | 기본 정책 해석에 간접 영향 | 내부 운영 임계치 |

## 3) Missing Domain Model Layers

- `GlobalCustomer` (누적 고객 마스터)
- `BranchCustomerProfile` (지점별 추천/메모/누적 반응)
- `SessionParticipant` (세션 참여 상태)
- `ReservationRecord` (예약 원천)
- `LiveParticipantState` (현장 상태 신호)
- `ContactExchange` (동의/완료/제한)
- `Report/Incident` (신고/사건)
- `StaffRecommendation` (등급/태그/메모)
- `AuditLog` (운영 이력)

현재는 `ParticipantRecord` 및 `SessionSnapshot`에 과도하게 평탄화되어 있습니다.

## 4) P0 / P1 / P2 / P3 Roadmap

### P0 — 유료 테스트 전 필수

- CustomerSafe DTO 적용 (고객 비노출 데이터 차단)
- Admin↔Customer 동기화 매트릭스/검증 체크리스트 고정
- 역할별 메뉴 가시성(HQ/Branch) 재점검
- 무동작 버튼 제거/비활성 사유 명시
- 공통 로딩/오류/빈 상태 표준화

### P1 — 첫 실제 지점 전 필수

- 도메인 타입 분리 시작 (`GlobalCustomer`, `BranchCustomerProfile`, `LiveParticipantState`)
- 예약/CRM 데이터 계약 확정 (placeholder -> 구현 계약)
- 지점 단위 운영 리포팅/고객 현황의 책임 경계 고정

### P2 — 멀티브랜치 전 필수

- 멀티브랜치 집계 모델/HQ 뷰 확장
- staff recommendation/CRM 누적 지표 영속화
- 예약/고객/세션 projection 정합성 강화

### P3 — 스케일 단계

- snapshot 의존 축소, 도메인별 저장/조회 경계 확립
- 감사로그/리포트/연락처교환 분석 레이어 강화

## 5) Customer PWA Purpose Redefinition

- QR/check-in: 본인 입장 맥락 확정
- onboarding/profile: 참여 가능한 최소 프로필 입력
- participants/table: 현재 대화/선택 대상 확인
- hearts/reveal/contact: 선택 -> 결과 -> 상호 동의 흐름
- content: 운영자 활성화 콘텐츠 참여
- settings/report: 개인 설정/불편 신고

## 6) Admin Page Purpose Redefinition

- 본부: 사업 레벨 모니터링
- 지점: 당일 운영 상태
- 회차: 단일 OPEN 세션 운영 정보
- 라이브: 실시간 조작 우선순위 콘솔
- 고객 DB: CRM 준비형 read-only 관리면
- 예약: 예약 원천 연동 준비형 관리면

## 7) Verification Gates

- 모든 배치 종료 시:
  - `npm run typecheck`
  - `npm run build`
- 회귀 체크:
  - Admin 변경 -> Customer 즉시 반영
  - Customer 행동 -> Admin 즉시 반영
  - Customer 응답에 내부 운영 정보 비노출
  - HQ/Branch 역할 가시성 위반 없음

## 8) Manual Reservation Ops (No External Dependency)

- 네이버 연동 미가용 상황을 기본 시나리오로 본다.
- Admin 예약 현황에서 CSV 수동 업로드/검증/중복 전화 감지를 우선 지원한다.
- 예약 데이터는 참가자 자동 생성이 아니라 입장 자격 검증 컨텍스트로 사용한다.
- 운영 종료 후 CSV 내보내기(예약/체크인/연락처 공유/노쇼)를 필수 보조 경로로 유지한다.

## 9) Manual / Auto / Hybrid Operation Rules

### Manual only (Admin explicit action)

- 세션 단계 전환
- 하트 공개 타이밍
- 참가자 이동
- 차단/해제
- 신고 처리
- 콘텐츠 노출
- 스태프 추천/등급/메모

### Automatic (system computed)

- 하트 수
- 상호 매칭
- 연락처 공유 상태
- 참가자 상태(활성/비활성)
- 예약 집계
- 테이블 인원 집계

### Hybrid (recommend-only)

- ROUND_2 좌석 추천안 생성 (자동 적용 금지)
- 위험 신호 표시 (처벌 자동화 금지)
- 재초대 후보 데이터 제공 (태깅 자동화 금지)

## 10) Remaining blockers (immediate)

- R2 `check:r2` 통과와 별개로 실제 업로드 경로(압축->PUT->CDN URL->재로딩) 수동 실검증 필요
- XLSX 직접 업로드 지원 여부 미결정: 라이브러리 도입 또는 CSV 변환 운영가이드 중 하나로 고정 필요
