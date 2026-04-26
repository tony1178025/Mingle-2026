# Level 1 Session Completion Checklist

목표: 한 지점의 한 회차가 `QR -> 온보딩 -> 하트 -> 리빌 -> 연락처 -> 신고 -> 종료`까지 끊기지 않고 동작하는지 검증한다.

## 배포 전/직후 기본 점검

1. **Vercel 최신 커밋 확인**
   - Vercel Production 배포의 Source Commit이 최신 `main` 커밋과 일치하는지 확인.
   - Preview가 아닌 Production URL에서 검증한다.

2. **기본 라우트 헬스체크**
   - `/api/session/current`가 `200` 응답인지 확인.
   - `/admin`이 시각적으로 정상 로드되는지 확인(빈 화면/치명 에러 없음).
   - `/customer?branchId={branchId}&tableId={tableId}` URL이 직접 열리는지 확인.

## 사전 조건

- 운영 세션은 1개만 OPEN 상태여야 한다.
- Admin 창 1개, Customer 창 2개(모바일 뷰포트) 준비.
- Admin은 `/admin`, 고객은 QR 또는 `/customer?branchId={branchId}&tableId={tableId}`로 진입.

## 수동 브라우저 테스트 절차

1. **QR 진입 확인 (고객 2명 흐름 시작)**
   - Admin의 QR 카드에서 테이블 QR이 노출되는지 확인.
   - 고객 A/B가 웹 URL QR로 진입하면 랜딩 없이 온보딩으로 이동.
   - 잘못된 QR이면 `"입장 정보를 확인할 수 없어요. QR을 다시 스캔해주세요."` 표시.

2. **온보딩 완료**
   - 고객 A/B 각각 필수 프로필 입력 후 입장.
   - 새로고침 후에도 동일 참가자 상태가 유지되는지 확인.
   - 중복 제출 시 중복 참가자가 생성되지 않는지 확인.

2-1. **예약 CSV 적용/영속화**
   - 예약 CSV 업로드 -> 미리보기 -> `업로드 적용` 실행.
   - 적용 후 예약 목록/지표가 미리보기가 아니라 저장 데이터 기준으로 유지되는지 확인.
   - 같은 CSV를 재적용했을 때 전화번호+일자+회차 기준 중복이 추가되지 않는지 확인.

3. **라이브 상태 연동**
   - Admin에서 단계 전환: `CHECKIN -> ROUND_1 -> BREAK -> ROUND_2`.
   - 고객 화면의 단계/상태가 즉시 반영되는지 확인.

4. **하트/리빌**
   - 고객 A가 B에게 하트 전송.
   - 고객 B가 A에게 하트 전송(상호 하트).
   - 중복 하트는 차단되고 안내 문구가 표시되는지 확인.
   - 하트 소진 시 `"남은 하트가 없어요."` 표시 확인.
   - Admin이 ROUND_2에서만 리빌 실행 가능해야 함.

5. **연락처 교환**
   - 리빌 전에는 연락처 교환 요청이 거절되는지 확인.
   - 상호 하트 + 양측 동의 후에만 COMPLETED 되는지 확인.
   - 고객 안내 문구: `"서로 동의해야 연락처가 공개됩니다."`

6. **신고/제재**
   - 고객이 신고 제출 -> Admin 신고 목록에 표시 확인.
   - Admin 차단 시 고객 제약 반영 확인.

6-1. **ROUND_2 로테이션 수동 적용**
   - Admin `추천 생성 -> 경고/설명 확인 -> 다시 섞기(선택) -> 적용` 순서로 실행.
   - 적용 후 `participant.tableId`, `seatingAssignments`, `auditLogs`가 갱신되는지 확인.
   - 고객 테이블 화면이 새 좌석으로 갱신되는지 확인.

7. **세션 종료**
   - Admin이 세션을 CLOSED로 전환.
   - 종료 후 Admin 조작 명령이 거절되는지 확인.
   - 세션 종료 후 결과 CSV(예약/체크인/연락처 공유/노쇼) 내보내기 가능 여부 확인.

8. **응답 경계 확인**
   - 고객 응답에는 내부 필드가 없어야 함:
     - `auditLogs`
     - `blacklist`
     - `reports`
     - `incidents`
   - Admin 응답에는 운영 필드가 유지되어야 함.

9. **프로필 사진 업로드 실검증 (R2 또는 fallback)**
   - 사진 선택 -> 압축 -> presigned URL -> 업로드 -> CDN URL 반영 -> 새로고침 후 유지 확인.
   - R2 미설정 환경에서는 기본 아바타로 완료 가능하고 프로필 완료가 막히지 않는지 확인.

## 자동 검증 명령

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run verify:deploy -- --baseUrl=https://<your-production-domain>`
