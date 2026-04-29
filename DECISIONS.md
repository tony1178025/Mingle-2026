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