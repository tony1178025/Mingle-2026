# Storage R2 Setup

## 로컬 파일 사용

- 로컬 확인 파일: `mingle_R2.env`
- 절대 커밋 금지:
  - `.env`
  - `.env.local`
  - `mingle_R2.env`

## 필수 키

- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`

## 검증 명령

- `npm run check:r2`
- 누락 키만 출력하며, 비밀값은 출력하지 않음

## 앱 동작 원칙

- R2 키 유효:
  - presigned 업로드 활성화
- R2 키 누락/오류:
  - 업로드 비활성화
  - 기본 아바타 fallback
  - 프로필 완료는 차단하지 않음

## Vercel 환경변수

- Production/Preview 모두 동일 키 세트 적용
- `R2_ENDPOINT`는 선택값이며, `R2_ACCOUNT_ID`가 있으면 endpoint를 자동 계산 가능

## CORS / CDN

- R2 버킷 CORS에 업로드 도메인 허용 필요
- 공개 URL은 `R2_PUBLIC_BASE_URL` 기준
- 캐시 전략: immutable 경로 + 장기 캐시
