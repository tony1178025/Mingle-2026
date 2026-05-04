# Mingle Master Specification (v1.0)

본 문서는 기존 운영/아키텍처 문서의 핵심 제약을 요약한 참조 명세다.

## 핵심 제약

- 아키텍처 축: Global -> Branch -> Session -> Live Ops
- 브랜치당 OPEN 세션은 1개만 허용
- 세션은 시작 후 12시간 경과 시 자동 종료
- Late entry는 ROUND_1/ROUND_2에서 허용(종료 단계 제외)
- QR은 항상 table 기반
- Server is source of truth
- Client must not compute authoritative state
- Derived state should not be persistently stored as authority

## Product Boundaries

- 고객/사업 운영 자동화 기능은 Phase 4 이후 확장
- 개발 자동화는 AGENT.md의 Safety Gate를 전제로 허용

## UX 원칙

- Korean-first UI
- Admin: clean/bright/functional/low-complexity
- Customer PWA: mobile-first and operationally stable
