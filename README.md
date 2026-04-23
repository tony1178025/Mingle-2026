# Mingle

?쒓뎅???곗꽑 ?꾨━誘몄뾼 ?뚯뀥 ?ㅼ씠???댁쁺 ?깆엯?덈떎.  
怨좉컼??PWA? ?댁쁺??PC ?뱀쓣 ?섎굹??Next.js 肄붾뱶踰좎씠?ㅻ줈 援ъ꽦?덇퀬, ?뚯씠釉?湲곕컲 ?먯깋, ?섑듃 怨듦컻 寃뚯씠?? ?뚯쟾 誘몃━蹂닿린/?곸슜, ?댁쁺 媛쒖엯 ?좏샇瑜?以묒떖?쇰줈 ?ㅺ퀎?덉뒿?덈떎.

![Mingle brand preview](./%EB%B8%8C%EB%9E%9C%EB%93%9C%20%EB%94%94%EC%9E%90%EC%9D%B8.png)

## What This Repo Ships

- 怨좉컼??PWA
  - QR / 4?먮━ 肄붾뱶 / ?ㅽ깭??fallback 泥댄겕??  - ?쒗븳???꾨줈???낅젰
  - ?뚯씠釉?湲곕컲 ?먯깋
  - ?쇱슫?쒕퀎 ?섑듃 UX
  - ?좉퀬 / ?뚮┝ 吏꾩엯
- ?댁쁺??PC ??  - ?쇱씠釉??곹깭 蹂닿린
  - 怨듦컻 ?좉?
  - ?뚯쟾 preview ??apply
  - heat / intervention / audit / report ?뺤씤
- ?꾨찓???붿쭊
  - scoring
  - tiering
  - reveal gating
  - heat
  - intervention recommendation
  - structured rotation

## Product Rules Preserved

- 釉뚮옖?? `Mingle`
- Korean-first UI copy
- 怨좉컼 ?먯깋? flat list媛 ?꾨땲??table-first
- ?섑듃 怨듦컻 洹쒖튃:
  - `session.phase === "ROUND_2"`
  - admin reveal toggle ON
  - reveal은 ROUND_2 + admin toggle로만 열림
- heat???댁쁺 ?꾩슜
- 泥??먮━???섎룞?????덉?留? ?댄썑 ?뚯쟾? 援ъ“?곸쑝濡?愿由?
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

湲곕낯 怨좉컼 ?붾㈃:

- `http://localhost:3000/customer`

?댁쁺 ?붾㈃:

- `http://localhost:3000/admin`

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

?꾩옱 repo 湲곗??쇰줈 ??寃利앹? ?듦낵???곹깭?낅땲??

## Environment Variables

?ㅽ솚寃??곌껐 ?꾩뿉??seed/demo 紐⑤뱶濡??숈옉?⑸땲??  
?ㅼ꽌鍮꾩뒪 ?곌껐???꾩슂???뚮뒗 [.env.example](./.env.example)??湲곗??쇰줈 媛믪쓣 梨꾩슦硫??⑸땲??

二쇱슂 踰붿＜:

- Supabase
- Firebase Messaging
- R2 / S3 storage
- service role key

## Deployment

沅뚯옣 諛고룷 寃쎈줈??**Vercel** ?낅땲??

- ?먰겢由?import:
  - [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/tony1178025/mingle-production)
- import ???ㅼ젙??寃?
  - `.env.example`???섍꼍蹂???낅젰
  - Production Branch瑜?`main`?쇰줈 ?좎?
  - Preview / Production 紐⑤몢 Next.js 湲곕낯 ?ㅼ젙 ?ъ슜

????μ냼??GitHub? ?대? ?곌껐?섏뼱 ?덉쑝誘濡? Vercel ??쒕낫?쒖뿉??repo import留?留덉튂硫??댄썑 `main` push濡??먮룞 諛고룷 ?먮쫫??留뚮뱾 ???덉뒿?덈떎.

???깆? ?ㅼ쓬 ?댁쑀濡?**GitHub Pages???곹빀?섏? ?딆뒿?덈떎**.

- App Router route handlers ?ъ슜
- ?낅줈??/ ?뚮┝ API ?붾뱶?ъ씤??議댁옱
- PWA ?쒕퉬?ㅼ썙而?諛??고????숈옉 ?ы븿
- 異뷀썑 Supabase / auth / realtime ?곕룞 ?덉젙

利? GitHub Pages 媛숈? ?뺤쟻 ?몄뒪?낆씠 ?꾨땲??**Vercel ?먮뒗 ?숆툒??full-stack Next.js ?고???*??諛고룷?섎뒗 寃껋씠 留욎뒿?덈떎.

## Core Docs

- [Architecture](./docs/architecture.md)
- [Source Comparison](./docs/source-comparison.md)
- [Merge Strategy](./docs/merge-strategy.md)
- [Bug Fixes](./docs/bug-fixes.md)
- [Design Upgrade](./docs/design-upgrade.md)
- [External Integrations](./docs/external-integrations.md)
- [Production Readiness](./docs/production-readiness.md)

## Current Delivery State

?꾩옱 ?곹깭??`demo-safe production architecture` ?④퀎?낅땲??

以鍮꾨맂 寃?

- 怨좉컼/?댁쁺 ?붾㈃ 援ъ“
- ?듭떖 ?꾨찓??濡쒖쭅
- ?뚯뒪??泥닿퀎
- ?깅뒫 ?덉궛 遺꾨쪟? web vitals reporting hook

?⑥? ?ㅼ뿰??

- Supabase production wiring
- offline admin heart grant flow
- auth / role gate
- realtime sync
- push backend
- observability backend

## Repository

- GitHub: [tony1178025/mingle-production](https://github.com/tony1178025/mingle-production)

