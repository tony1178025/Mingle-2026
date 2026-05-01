# Locked Decisions

## Entry
- QR = table-bound only
- auto match session
- fallback = 4-digit code

## Session
- 1 OPEN per branch
- auto close 12h
- manual close allowed

## Participation
- intro required
- late entry always allowed
- no waiting
- reservation grants eligibility only (not participant creation)
- participant is created only after QR check-in on Mingle server

## External Boundary
- website handles entry guidance/reservation context only
- website/reservation system never creates participant directly
- reservation lookup rule: reservationExternalId first, normalized phone fallback

## Table
- belongs to branch
- fixed QR
- subset used per session

## Admin
- move allowed
- no reason required
- BUT must log

## Content
- global library
- session ON/OFF
- no push

## Philosophy
System supports operator.

## 7. 개발 에이전트 자동화 허용

기존 Phase 4 자동화는 고객/사업 운영 자동화를 의미한다.

개발 자동화 에이전트는 별도 범위로 즉시 허용한다.

허용 범위:
- 코드 수정
- 테스트/빌드
- DB migration
- 배포 스크립트
- 환경변수 검증
- 리팩토링
- 문서 업데이트

단, DB 삭제/운영 배포/외부 API는 Safety Gate 통과 필수.

## 8. E2E deterministic bootstrap 경계

- 테스트 전용 bootstrap은 `/api/test/e2e/bootstrap` 경로에서만 허용한다.
- `E2E_SEED_ENABLED !== "true"` 이면 bootstrap 요청을 차단한다.
- production 환경에서는 bootstrap을 항상 차단한다(404).
- bootstrap은 운영 DB를 변경하지 않고 파일 기반 테스트 데이터(`.mingle-data`)만 갱신한다.
- bootstrap 응답에는 테스트 실행에 필요한 최소 정보만 포함하고 운영 민감정보는 포함하지 않는다.