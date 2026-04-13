# Mingle Merge Strategy

## 유지한 것

### From A

- App Router 중심 사고
- `engine`를 순수 계산 계층으로 두는 방향
- 고객/운영/공용 경계 분리 원칙

### From B

- flat list가 아닌 table-based explore 방향
- 첫 배치는 다소 수동이어도 이후 회전은 구조화돼야 한다는 제품 감각
- 운영자가 현장 개입 포인트를 빠르게 읽어야 한다는 UX 전제

### From C

- Zustand typed slice 패턴
- Supabase row mapping과 repository adapter 골격
- dark surface 기반 디자인 토큰
- Vitest / Playwright test scaffold

## 삭제한 것

- 루트의 legacy `.js/.jsx` 중복 트리
- fake demo logic가 실질 source of truth처럼 작동하던 코드
- `useSessionStore.js`, `useUiStore.js`, `rotationEngine.js`, `mockData.js` 등 donor 잔존 레거시
- flat-list-first 탐색 구조
- profile에 다시 넣으려던 불필요 필드
- Turbopack와 `next-pwa`가 충돌하던 잘못된 runtime script 조합

## 재작성한 것

- `lib/mingle.ts`
  - 시드 데이터, 한국어 카피, 도메인 상수, Supabase row mapping 전부 재작성
- `engine/reveal`
  - reveal rule과 4-state copy 재작성
- `engine/intervention`
  - 운영 권고 메시지와 우선순위 로직 정리
- `engine/rotation`
  - deterministic preview/apply 메시지, note/warning, audit 문구 정리
- `components/customer/CustomerApp.tsx`
  - 온보딩, 테이블 탐색, 하트, 콘텐츠, 신고/설정 전체 재구성
- `components/admin/AdminDashboard.tsx`
  - 운영 대시보드, 회전 미리보기, audit/history 흐름 재구성
- `tests/*`
  - merged runtime과 실제 UX에 맞춰 전부 갱신

## 구조 원칙

- mock는 seed/demo fallback일 뿐, 진짜 도메인 흐름을 대신하지 않는다.
- 파생 계산은 store selector에서 즉시 새 객체를 생성하지 않고, 화면에서 `useMemo`로 계산한다.
- 운영 기능은 `preview -> compare -> apply -> audit` 순서로만 흐른다.
- 고객 공개 규칙은 단 하나의 authoritative rule로만 유지한다.
