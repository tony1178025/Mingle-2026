# AI Automation Center (Design Only)

이번 주 범위에서 AI Automation Center는 **설계 구조만 등록**한다.
아래 항목은 구현하지 않는다.

- OpenClaw 연동
- AI 자동응답
- 자동 발송
- 환불 자동화

## 목적

- Admin 콘솔 내 자동화 기능 진입점의 구조를 선등록
- 운영 데이터 연계를 위한 최소 스키마 초안 준비
- 추후 구현 시 도메인/계약/권한 흐름을 안전하게 확장할 수 있도록 기반 정리

## 이번 주 포함 범위

1. 문서 구조 등록 (`docs/ai-automation/*`)
2. Admin 메뉴 placeholder 등록
3. `automation_queue`, `automation_logs` 스키마 draft 등록

## 제외 범위

- 실행 엔진
- 외부 API 호출
- 비동기 워커/스케줄러
- 운영 자동 승인/자동 환불 로직

