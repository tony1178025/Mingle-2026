# Mingle External Integration Checklist

## Ready-to-wire adapters

1. Supabase
- ?몄뀡/李멸????섑듃/?좉퀬/媛먯궗 濡쒓렇/醫뚯꽍 諛곗튂 row mapping ?꾨즺
- ?⑥? ??
  - ?ㅼ젣 project URL / anon key / service role ?ㅼ젙
  - migration SQL
  - realtime channel ?곌껐

- ?⑥? ??

3. Object Storage
- ?꾨줈???ъ쭊 presigned upload API 援ы쁽 ?꾨즺
- ?⑥? ??
  - R2/S3 credential ?ㅼ젙
  - bucket lifecycle / ACL / image moderation ?뺤콉

4. Push Notifications
- FCM ?좏겙 ?깅줉 ?먮쫫怨?service worker 寃쎈줈 以鍮?- ?⑥? ??
  - Firebase web app config
  - VAPID key
  - ?ㅼ젣 ?댁쁺 ?뚮┝ trigger job

5. Auth / Roles
- 怨좉컼/?댁쁺 ?붾㈃ 遺꾨━?????덉?留?auth gate???꾩쭅 ?녿떎
- ?⑥? ??
  - 怨좉컼 泥댄겕???몄쬆
  - ?댁쁺??role-based access
  - audit actor real identity ?곌껐

6. QR Scanner
- QR payload ?щ㎎? 以鍮꾨맖
- ?⑥? ??
  - ?ㅺ린湲?camera scan UI
  - permission fallback
  - low-light / invalid QR handling

7. Live Ops Infra
- polling abstraction 以鍮?- ?⑥? ??
  - realtime transport
  - failover sync ?뺤콉
  - observability / alerting


