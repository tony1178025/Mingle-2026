# PROJECT_STATE

## Updated

- 2026-04-29 (16:14 UTC)

## Current Branch

- `cursor/round1-payload-minimize-1fa1`

## Current Repository Status

- Core customer/admin flows compile and pass full local verification.
- Recent work stabilized:
  - ROUND_1 customer participant minimal payload exposure
  - customer-side `tableLabel` usage paths
  - QR regenerate command contract hardening (`sessionId` binding)
  - QR revoke endpoint and command path added (`/api/admin/sessions/[sessionId]/tables/[tableId]/qr/revoke`)
  - AI Automation Center design-only docs + schema draft placeholder
- Missing top-level control docs were restored in this commit:
  - `AGENT.md`
  - `PROJECT_STATE.md`
  - `ROADMAP.md`
  - `TASKS.md`
  - `QA_CHECKLIST.md`

## Implemented (High-Level)

- Customer signed session boundary in runtime.
- Admin RBAC + branch/session management surface.
- Session state controls + reveal flow.
- Blacklist/incident baseline.
- QR regenerate with active-code replacement and revoke marking.
- Customer payload sanitization boundary (admin vs customer).

## Broken / Inconsistent (Current Known)

1. Top-level execution docs were previously missing (now restored).
2. ROADMAP/TASKS alignment drift existed between docs and actual code status.
3. Some roadmap items are still in-progress by design:
  - content UX modular decomposition
  - richer live-ops smoke automation
  - expanded end-to-end scenario coverage

## This Iteration Changes

- Restored missing agent control documents.
- Synced current known status and next actions into TASKS/ROADMAP.
- Added autonomous execution policy + safety gate decisions to top-level docs.
- Added policy: every meaningful code/config change must be followed by markdown state updates.
- Implemented high-priority QR lifecycle gap fix: explicit revoke API/command path.
- Added Mingle Master Specification v1.0 placeholder spec doc for agent read order continuity.
- Expanded `/api/customer/*` visibility contract coverage with phase-aware unit tests:
  - ROUND_1 allowed/blocked field enforcement
  - ROUND_2 allowed/blocked field enforcement
  - phase transition visibility assertions
  - blocked/logged-out participant list visibility assertions
  - tableLabel visibility behavior assertions
- Hardened serializer contract for ROUND_2 by removing `tableLabel` exposure.
- Adjusted client normalize path to avoid restoring removed ROUND_1 fields.
- Preserved existing architecture and business rules.

## Verification Baseline

- Latest successful local verification in this iteration:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## Remaining Blockers

- No hard technical blocker at this moment.
- Next work should prioritize `Admin Live Ops 스모크 체크리스트 자동화` in `TASKS.md`.