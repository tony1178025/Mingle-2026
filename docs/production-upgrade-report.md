# Production Upgrade Report

## Changelog

- Introduced Next.js App Router project structure with customer and admin entries.
- Added deterministic demo seed and local repository persistence for realistic flows.
- Added structured Zustand store with explicit actions and selectors.
- Added real rotation preview/apply engine with audit support.
- Added exact reveal gating logic for hearts.
- Added polished customer and admin UI layers with reusable surfaces, badges, metrics, and heat bars.
- Added unit, integration, and Playwright coverage scaffolds for critical paths.

## Bugs found and fixed

- Fixed monolithic state sprawl by centralizing core session logic.
- Fixed incomplete reveal logic by enforcing all 3 conditions together.
- Fixed fake rotation apply behavior by updating assignments and `metParticipantIds`.
- Fixed missing admin preview/apply separation.
- Fixed customer explore structure being list-first instead of table-first.
- Fixed absence of polling boundary by introducing session polling abstraction.
- Fixed lack of backend-ready models by separating domain, DB row, and API contracts.
- Fixed unlock-message edge case when reveal is enabled but inbox count is zero.

## Remaining external integrations

- Real QR scanner / device camera flow
- Offline admin heart grant flow
- Supabase persistence and Realtime subscription wiring
- Auth / participant identity binding
- File upload storage for profile photos
- Admin auth and role isolation

## Production readiness assessment

- Structure: strong enough for another engineer to continue without untangling prototype logic.
- UI: premium and intentional, but still needs final visual QA on live devices once dependencies are installed.
- Engine: preview/apply flow is real and tunable, but should be validated against live event data before launch.
- Data: contracts are backend-ready and migration-minded.
- Testing: good skeleton with meaningful assertions; not executed in this environment because Node/NPM are unavailable here.

## Design upgrade rationale

- Customer UI now leads with calm dark depth instead of noisy novelty.
- Round 1 and Round 2 are visually distinct through background, contrast, and emphasis shifts.
- Admin UI now optimizes immediate scan value rather than decorative dashboard density.
- Typography uses a Korean-first system font strategy with a premium serif accent only where it adds emotional weight.

