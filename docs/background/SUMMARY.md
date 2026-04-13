# Mingle 배경지식 요약(운영/제품 관점)

이 문서는 `.cursor/Mingle_Background_Knowledge_260413_0614.md` 및 외부 배경 문서들을 기반으로, **개발 중 의사결정의 기준축**을 짧게 고정한다.

## 제품이 “앱”이 아니라 “현장 운영 시스템”인 이유

- Mingle은 온라인 매칭 앱이 아니라 **오프라인 파티 현장 운영**을 위한 시스템이다.
- 따라서 성공 기준은 “그럴듯한 알고리즘”이 아니라:
  - 운영자가 **몇 초 안에** 상황을 읽고 조치할 수 있는가
  - 리빌/로테이션/탐색이 **정책대로** 일관되게 동작하는가
  - 이벤트 압박(현장 혼잡)에서도 **실수/클레임이 줄어드는 UX**인가

## 핵심 플로우(도메인)

- 체크인(고객): QR / 4-digit code / 스태프 fallback
- 프로필 작성(허용된 필드만)
- 테이블 배치(탐색도 table-based)
- 1부/2부 운영
- 하트 시스템 + 리빌(공개) 게이트
- 로테이션: preview → apply + 감사 로그 + 운영 개입

## 불변 규칙(구현 시 “단일 진실”로 유지)

- 하트 가격: 5,000원(남녀 동일)
- 1부: 받은 하트 “개수”만 보임
- 2부 공개 조건:
  - ROUND_2
  - admin reveal toggle = ON
  - usedFreeHearts ≥ 3
- Heat: admin only, 고객 노출 금지
- 고객 탐색 UX: table-based 유지(리스트 퍼스트로 퇴행 금지)
- 프로필:
  - MBTI는 E/I만
  - 한줄소개 없음

## 알고리즘/엔진 설계에서 반드시 던져야 하는 질문

- A-tier 보호가 과해서 일반 고객이 “희망 없음” 상태가 되지 않는가?
- 분산(밸런싱)이 과해 핵심 고객 재방문이 떨어지지 않는가?
- E/I 반영이 과적합은 아닌가?
- `profileViews` 같은 지표가 허수 신호가 되지 않는가?

## AI 사용 원칙(현실적으로 “지금 유용한 것” 위주)

- 지금 바로 유용:
  - 운영자 추천(개입 제안)
  - 신고/리포트 분류
  - 사후 분석(회고/리텐션/클레임 원인)
- 구조만 준비:
  - 재방문 가능성(revisit likelihood)
  - 개입 추천(intervention suggestion)
- 비추천:
  - 과한 감정 분석
  - 블랙박스 매칭
  - explainability 낮은 핵심 의사결정 AI

## 디자인 의도(프리미엄 톤)

- 고객용(PWA):
  - dark luxury
  - deep purple + restrained pink pulse + subtle gold
  - layered surfaces, premium depth
  - cheap neon / noisy effects 금지
- 어드민(PC 웹):
  - scanability first
  - heat / risk / state 빠른 인지
  - 낮은 인지 부하, 권위/명료성

