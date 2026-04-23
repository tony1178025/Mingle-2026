# Mingle Design Upgrade Report

## Research Pass Additions

- 리서치 문서 반영 기준:
  - Apple-like hierarchy와 feedback discipline
  - 명확한 입력 품질과 절제된 브랜드 컬러 사용
  - Web Vitals, 특히 INP를 체감 품질의 일부로 취급
- 이번 패스에서 실제 반영한 코드:
  - hero signal card 추가
  - admin ops signal strip 추가
  - `tabPanel`, `roundShift`, `opsCommit` 모션 토큰 추가
  - `prefers-reduced-motion` 대응 추가
  - 입력 필드 `autocomplete`, `pattern`, `maxLength`, `aria-describedby` 보강
  - web vitals reporting과 performance budget 분리 추가

## Customer Experience

- 방향: dark luxury
- 기본 축
  - base: deep ink / charcoal
  - accent: pulse pink
  - support: restrained violet
  - highlight: subtle gold
- 효과:
  - flat prototype 느낌을 줄이고 감정 밀도가 있는 night-session 톤으로 정리
  - 카드 위계, hero, layered surface, 집중 정보 배치를 사용

## Admin Experience

- 방향: crisp, fast, authoritative
- 고객 화면과 분리된 light ops canvas 적용
- KPI, heat, intervention, history를 바로 읽을 수 있도록 hierarchy 조정
- reveal / phase / rotation control을 hero 바로 아래 live-control 섹션으로 고정

## Typography

- UI font: `Noto Sans KR`, `Pretendard`
- display font: `Cormorant Garamond`
- 고객 hero의 감정 톤과 운영 hero의 판단 톤이 같은 시스템 안에서도 다른 인상을 주도록 구성
