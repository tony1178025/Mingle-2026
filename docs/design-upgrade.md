# Mingle Design Upgrade Report

## Research Pass Additions

- 리서치 문서 반영 기준:
  - Apple-like hierarchy와 feedback discipline
  - Toss-like token system / component API 사고
  - Stripe-like 입력 품질과 브랜드 컬러 절제
  - Web Vitals, 특히 INP를 premium 품질의 일부로 취급
- 이번 패스에서 실제 반영한 코드:
  - hero signal card 계층 추가
  - admin ops signal strip 추가
  - `tabPanel`, `roundShift`, `opsCommit` 모션 토큰 추가
  - `prefers-reduced-motion` 대응 추가
  - 입력 필드 `autocomplete`, `pattern`, `maxLength`, `aria-describedby` 보강
  - web vitals reporting과 performance budget 분류 추가

## Customer Experience

- 방향: dark luxury
- 기준 색:
  - base: deep ink / charcoal
  - accent: pulse pink
  - support: restrained violet
  - highlight: subtle gold
- 효과:
  - flat prototype 느낌을 줄이고, 감정 밀도가 있는 night-session 톤으로 정리
  - 카드 남발 대신 큰 hero, layered surface, 집중된 정보 밀도를 사용

## Admin Experience

- 방향: crisp, fast, authoritative
- 다크 고객 화면과 분리된 light ops canvas 적용
- KPI, heat, intervention, history를 바로 읽을 수 있도록 hierarchy 재정렬
- reveal / phase / rotation control을 hero 바로 아래 live-control 섹션으로 고정

## Typography

- UI font: `Noto Sans KR`, `Pretendard`
- display font: `Cormorant Garamond`
- 고객 hero는 감정 톤, 운영 hero는 판단 톤에 맞춰 같은 토큰 안에서 다른 인상을 주도록 구성

## Spacing / Radius / Elevation

- spacing token을 `--space-*`로 통일
- radius를 `xl/lg/md/sm`으로 재정의해 무의미한 inline radius를 제거
- dark shadow / light shadow를 분리해 고객/운영 surface depth를 다르게 가져감

## Motion

- `pageEnter`
  - 화면 전환 첫 인상을 정리
- `tabPanel`
  - 고객/운영 탭 전환에 짧고 일관된 방향성을 부여
- `roundShift`
  - 라운드 변화가 생길 때 hero 상태 영역이 조용히 재정렬되도록 구성
- `cardLift`
  - 테이블/참가자 카드 hover 감도를 통일
- `revealUnlock`
  - 하트 공개 순간만 강조
- `opsCommit`
  - 운영 회전 미리보기 결과가 “확정 가능한 상태”로 바뀌는 순간을 분명히 전달
- `toast`
  - 운영/고객 공통 피드백을 noisy하지 않게 표준화

## Accessibility / Input Quality

- dark / light surface 각각에 맞는 focus ring 기준 추가
- `prefers-reduced-motion` 대응으로 과한 전환 제거
- 체크인 4자리 코드는 `one-time-code`, `pattern`, `maxLength`를 추가
- 신고 폼은 대상과 상세 내용 기준이 분명해지도록 helper copy와 disabled state를 추가

## UX 개선 포인트

- 고객 탐색을 table-based rail + selected table detail 구조로 고정
- 1부/2부 차이를 카피와 정보 구조 모두에서 분명히 구분
- 신고는 깊숙한 메뉴가 아니라 settings 내 direct action으로 배치
- 운영 회전은 `생성 -> 회전 패널 전환 -> 비교 -> 적용`으로 한 번에 이어지게 보정
