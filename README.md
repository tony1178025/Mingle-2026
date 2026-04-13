# Mingle

한국어 우선 프리미엄 소셜 다이닝 운영 앱입니다.  
고객용 PWA와 운영용 PC 웹을 하나의 Next.js 코드베이스로 구성했고, 테이블 기반 탐색, 하트 공개 게이트, 회전 미리보기/적용, 운영 개입 신호를 중심으로 설계했습니다.

![Mingle brand preview](./%EB%B8%8C%EB%9E%9C%EB%93%9C%20%EB%94%94%EC%9E%90%EC%9D%B8.png)

## What This Repo Ships

- 고객용 PWA
  - QR / 4자리 코드 / 스태프 fallback 체크인
  - 제한된 프로필 입력
  - 테이블 기반 탐색
  - 라운드별 하트 UX
  - 신고 / 알림 진입
- 운영용 PC 웹
  - 라이브 상태 보기
  - 공개 토글
  - 회전 preview → apply
  - heat / intervention / audit / report 확인
- 도메인 엔진
  - scoring
  - tiering
  - reveal gating
  - heat
  - intervention recommendation
  - structured rotation

## Product Rules Preserved

- 브랜드: `Mingle`
- Korean-first UI copy
- 고객 탐색은 flat list가 아니라 table-first
- 하트 공개 규칙:
  - `session.phase === "ROUND_2"`
  - admin reveal toggle ON
  - `usedFreeHearts >= 3`
- heat는 운영 전용
- 첫 자리는 수동일 수 있지만, 이후 회전은 구조적으로 관리

## Tech Stack

- Next.js 16 App Router
- React 19
- Zustand
- Framer Motion
- Vitest
- Playwright
- Supabase-ready repository boundary
- PWA via `next-pwa`

## Project Structure

```text
app/          routes and route handlers
components/   customer, admin, shared UI
engine/       pure domain logic
features/     feature-level content and options
lib/          repository, data, performance, integration helpers
stores/       Zustand slices and selectors
types/        domain / db / api contracts
tests/        unit, integration, e2e
docs/         comparison, merge, readiness, design reports
```

## Local Development

```bash
npm install
npm run dev
```

기본 고객 화면:

- `http://localhost:3000/customer`

운영 화면:

- `http://localhost:3000/admin`

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

현재 repo 기준으로 위 검증은 통과한 상태입니다.

## Environment Variables

실환경 연결 전에는 seed/demo 모드로 동작합니다.  
실서비스 연결이 필요할 때는 [.env.example](./.env.example)을 기준으로 값을 채우면 됩니다.

주요 범주:

- Supabase
- Firebase Messaging
- R2 / S3 storage
- service role key

## Deployment

권장 배포 경로는 **Vercel** 입니다.

- 원클릭 import:
  - [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/tony1178025/mingle-production)
- import 후 설정할 것:
  - `.env.example`의 환경변수 입력
  - Production Branch를 `main`으로 유지
  - Preview / Production 모두 Next.js 기본 설정 사용

이 저장소는 GitHub와 이미 연결되어 있으므로, Vercel 대시보드에서 repo import만 마치면 이후 `main` push로 자동 배포 흐름을 만들 수 있습니다.

이 앱은 다음 이유로 **GitHub Pages에 적합하지 않습니다**.

- App Router route handlers 사용
- 업로드 / 알림 API 엔드포인트 존재
- PWA 서비스워커 및 런타임 동작 포함
- 추후 Supabase / auth / realtime 연동 예정

즉, GitHub Pages 같은 정적 호스팅이 아니라 **Vercel 또는 동급의 full-stack Next.js 런타임**에 배포하는 것이 맞습니다.

## Core Docs

- [Architecture](./docs/architecture.md)
- [Source Comparison](./docs/source-comparison.md)
- [Merge Strategy](./docs/merge-strategy.md)
- [Bug Fixes](./docs/bug-fixes.md)
- [Design Upgrade](./docs/design-upgrade.md)
- [External Integrations](./docs/external-integrations.md)
- [Production Readiness](./docs/production-readiness.md)

## Current Delivery State

현재 상태는 `demo-safe production architecture` 단계입니다.

준비된 것:

- 고객/운영 화면 구조
- 핵심 도메인 로직
- 테스트 체계
- 성능 예산 분류와 web vitals reporting hook

남은 실연동:

- Supabase production wiring
- payment provider
- auth / role gate
- realtime sync
- push backend
- observability backend

## Repository

- GitHub: [tony1178025/mingle-production](https://github.com/tony1178025/mingle-production)
