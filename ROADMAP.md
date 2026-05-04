# ROADMAP

## 목적
Mingle PWA(Customer) + Admin Dashboard를 **Paid Beta 운영 가능 수준**으로 안정화한다.

## 고정 제약
- 아키텍처 재설계 금지
- 기존 사업 규칙 제거 금지
- Korean-first UI 유지
- Admin: 밝고 단순한 운영 화면
- Customer: 모바일 우선, 운영 안정성 우선

## 단기 우선순위 (현재)
1. Customer participant contract 최종 마감
2. QR lifecycle 완성(재생성/폐기/검증 강화)
3. Admin live ops 안정성 검증
4. E2E 핵심 시나리오 검증 강화
5. AI Automation Center는 설계 구조만 유지/보강

## 완료 정의
- `npm run lint` 통과
- `npm run typecheck` 통과
- `npm test` 통과(실패 시 원인/영향/후속 명시)
- `npm run build` 통과
- PROJECT_STATE/TASKS 최신화
