# Mingle External Integration Checklist

## Ready-to-wire adapters

1. Supabase
- 세션/참가자/하트/신고/감사 로그/좌석 배치 row mapping 완료
- 남은 일:
  - 실제 project URL / anon key / service role 설정
  - migration SQL
  - realtime channel 연결

2. Payment
- 하트 구매 UX와 provider boundary는 준비됨
- 남은 일:
  - 실제 checkout URL 또는 Stripe/토스페이먼츠 연결
  - webhook으로 `paidHeartBalance` 반영

3. Object Storage
- 프로필 사진 presigned upload API 구현 완료
- 남은 일:
  - R2/S3 credential 설정
  - bucket lifecycle / ACL / image moderation 정책

4. Push Notifications
- FCM 토큰 등록 흐름과 service worker 경로 준비
- 남은 일:
  - Firebase web app config
  - VAPID key
  - 실제 운영 알림 trigger job

5. Auth / Roles
- 고객/운영 화면 분리는 돼 있지만 auth gate는 아직 없다
- 남은 일:
  - 고객 체크인 인증
  - 운영자 role-based access
  - audit actor real identity 연결

6. QR Scanner
- QR payload 포맷은 준비됨
- 남은 일:
  - 실기기 camera scan UI
  - permission fallback
  - low-light / invalid QR handling

7. Live Ops Infra
- polling abstraction 준비
- 남은 일:
  - realtime transport
  - failover sync 정책
  - observability / alerting
