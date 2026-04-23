# Master Operations Roadmap

## Purpose

This document is the current operational, architectural, and execution handoff for the repository.

Use it as the source of truth for:
- COO operational control planning
- CTO architecture and migration sequencing
- CFO / finance operations planning
- CHRO / staffing and branch operations planning
- CEO rollout and organizational visibility
- Codex / developers continuing implementation on any machine

This is not a product brochure. It is a working document tied to the current repo state on `main`.

## Current System State

### 1. Check-in authority architecture

- QR contract is unified to `mingle://session/<sessionId>?code=<checkinCode>`.
- Synthetic reservation registry is removed from the active runtime.
- Customer check-in flows through:
  - `app/api/reservations/session-context/route.ts`
  - external reservation adapter boundary
  - server-side reservation/session verification
- Nickname is not the authority key.
- Duplicate nickname is validation, not identity authority and not admin override.

### 2. Participant identity

- `participantId` is the explicit runtime identity after check-in.
- `reservationId` remains reservation authority context.
- `reservationExternalId` and optional `phone` are bridged into participant/session recovery.
- Recovery priority is:
  1. known `participantId`
  2. reservation-linked participant identity
  3. optional phone consistency
- `viewerParticipantId` in local storage is treated as cache only, not trust anchor.

### 3. Signed customer session

- Customer participation is bound to a signed cookie session.
- Customer session binds:
  - `participantId`
  - `reservationId`
  - `sessionId`
  - `sessionVersion`
- Customer mutations are no longer trusted on raw client `participantId` alone.
- Hydration restore prefers server-validated signed customer session over local cache.

### 4. DB-backed authority

- File authority still exists.
- DB authority now exists in parallel and can be promoted via environment flags.
- Current repository split:
  - orchestration: `lib/repositories/server-repository.ts`
  - file authority: `lib/repositories/file-repository.ts`
  - DB authority: `lib/repositories/db-repository.ts`
  - authority selector: `lib/repositories/authority-backend.ts`
- Current flags:
  - `USE_DB_AUTHORITY`
  - `READ_FROM_DB`
- Current DB schema includes:
  - `hqs`
  - `branches`
  - `events`
  - `sessions`
  - `participants`
  - `reservations`
  - `admin_users`
  - `blacklist`
  - `incidents`

### 5. Blacklist, incidents, and monitoring

- Minimal blacklist exists and blocks check-in / customer actions.
- Minimal incident log exists for:
  - report submission
  - blacklist block events
  - suspicious / high-frequency patterns
- Monitoring/logging exists for:
  - authority mismatch
  - revoke/session mismatch
  - invalid customer session attempts
  - backfill activity

### 6. Admin RBAC

- Admin roles exist:
  - `HQ_ADMIN`
  - `BRANCH_ADMIN`
  - `STAFF`
- Current intent:
  - `HQ_ADMIN`: organization-level management
  - `BRANCH_ADMIN`: branch-scoped operations
  - `STAFF`: limited live-ops only
- Admin auth is separate from customer signed session.

### 7. Admin user / branch / session management

Current state in web admin:
- Admin user management exists:
  - list
  - create
  - edit
  - reset password
  - enable / disable
  - role assignment
  - branch assignment
- Branch management exists:
  - list
  - create
  - edit
  - soft-disable
  - default capacity / default table count
- Session management exists:
  - list
  - create
  - edit
  - open / close / disable
  - branch assignment
  - max capacity / metadata edit
- Audit metadata currently present at minimum on these records:
  - `created_at`
  - `updated_at`
  - `updated_by`
  - `last_login_at` for admin users

### 8. Deployment state in repo reality

GitHub:
- Current git remote in this workspace points to:
  - `https://github.com/tony1178025/Mingle-2026.git`
- Current `README.md` previously referenced a different GitHub slug.
- Treat repo/remote alignment as an operational verification item, not an assumption.

Vercel:
- `.vercel/project.json` exists in the repo-local workspace, so this repo has been linked locally to a Vercel project at least once.
- This does not prove production health by itself. It only proves project linkage metadata exists locally.

Supabase:
- Supabase schema and authority scripts exist in repo.
- Runtime requires Supabase env configuration for DB-backed authority and admin store.
- There is no repo-embedded production project binding beyond environment variables.

## Current Known Blockers

### 1. Admin bootstrap/login contract is still the top operational blocker until deployment is aligned

Current code behavior:
- Login identifier is explicit:
  - if input contains `@`, resolve against `admin_users.email`
  - otherwise resolve against `admin_users.id`
- Password verification uses `password_hash`.
- Seeded admin accounts use bootstrap password sources only for initial seed / first-login recovery:
  - `MINGLE_ADMIN_BOOTSTRAP_PASSWORD`
  - fallback: `MINGLE_ADMIN_PASSWORD`

Current required recovery flow:
- set bootstrap admin password env in deployed environment
- deploy current code
- reseed admin users or allow first-login recovery for never-used seeded accounts
- verify HQ login
- then reset admin passwords in UI if needed

Current remaining dependency:
- bootstrap password still depends on env for first-time seed/recovery
- this is acceptable for now, but it is still a deployment dependency

### 2. Deployment/runtime mismatch risks

- `.env.example` does not yet document all current operational env variables introduced across recent stabilization passes.
- GitHub remote in workspace and README repository link are not guaranteed to match.
- DB authority flags are environment-driven and must be verified explicitly:
  - `USE_DB_AUTHORITY`
  - `READ_FROM_DB`

### 3. Seed/bootstrap dependency remains

- Admin seed is still a required bootstrap action.
- Backfill is still a required bootstrap action for DB-first authority environments.
- These are acceptable for staging/prod launch, but they must be run deliberately and verified.

## What Is No Longer Acceptable To Manage Via Code, Env, Or Manual DB Edits

The following must be treated as web-managed operational data, not engineer-only change surfaces:

- admin accounts
- branch definitions
- session definitions and session lifecycle state
- operational messages and staff-facing runtime instructions
- policy values that change by branch or session
- participant operational status
- blacklist / VIP / risk handling
- SOP templates / shift checklists / branch rollout templates
- finance/KPI configuration values that change during operations

Current repo status:
- already web-managed:
  - admin accounts
  - branches
  - sessions
- not yet fully web-managed:
  - operational messages
  - policy/settings CMS
  - VIP tooling
  - richer incident/risk workflow
  - SOP/templates/checklists
  - finance/KPI settings

## C-Level Requirements By Role

### CEO

- needs branch-by-branch launch confidence
- needs clear production readiness gates
- needs visible operational blockers and ownership
- needs rollout sequence, not raw engineering detail

### COO

- needs web control over admins, branches, sessions, and operating states
- needs repeatable launch/checklist workflows
- needs live operational policy control without code edits
- needs incident/risk visibility across branches

### CTO

- needs authority migration order and rollback-safe architecture
- needs strict environment and seed/backfill contracts
- needs auditability and permission boundaries
- needs developer execution rules to prevent scope drift

### CFO / Finance

- needs branch/session capacity assumptions and operational configuration ownership
- needs future KPI/config control to move out of code
- needs reliable branch/session inventory as a basis for financial reporting later

### CHRO / HR / Operations Staffing

- needs admin/staff role management by branch
- needs staffing visibility by branch/session ownership
- needs templates/checklists for consistent branch rollout later

### CPO / Product

- must protect customer flow stability while operations tooling expands
- must keep nickname/display concerns separate from authority/identity concerns
- must prevent operational tooling from reintroducing authority drift

## Priority Roadmap By Phase

### P0. Immediate blocker fixes

Status:
- code-side admin bootstrap/login fix is in place

Still required operationally:
- deploy current login fix
- align bootstrap password env
- reseed or verify first-login recovery
- verify HQ admin login in staging and production
- verify DB authority flags and backfill state
- align deployment docs/env docs with current runtime

### Phase 1. Operational control core

Goal:
- complete reliable web control over admin users, branches, sessions, and related audits

Scope:
- stabilize current admin user / branch / session management
- add event management if needed for session creation flow
- harden audit/change visibility around those modules
- remove any remaining manual DB edits for core organization structure

### Phase 2. Live operations + policy/settings CMS

Goal:
- move normal operational knobs out of code and into web-managed configuration

Scope:
- operational messages
- branch defaults
- session policy overrides
- runtime reveal / report / intervention policy values
- default capacity and live settings hierarchy

### Phase 3. Participant operations + incident/risk tooling

Goal:
- give HQ/branch operators proper participant-level operational control

Scope:
- participant operational profile
- VIP management
- blacklist management UI expansion
- incident review workflow
- repeated-risk and abnormal-behavior tooling

### Phase 4. Standardization / templates / SOP / branch rollout

Goal:
- make multi-branch rollout repeatable and controlled

Scope:
- SOP templates
- branch onboarding templates
- default session templates
- staffing checklists
- operational playbooks and rollout packages

### Phase 5. Finance / KPI / executive visibility

Goal:
- add executive-grade visibility after operational control is stable

Scope:
- branch/session KPI configuration
- finance-facing operational views
- executive summary surfaces
- standardized data contracts for CFO/CEO reporting

## Exact Next-Step Implementation Order

Use this order. Do not reshuffle it casually.

1. Deploy the current admin login/bootstrap fix to staging.
2. Set `MINGLE_ADMIN_BOOTSTRAP_PASSWORD` in staging.
3. Run admin reseed in staging and verify HQ + branch admin login.
4. Verify DB authority backfill and `READ_FROM_DB` / `USE_DB_AUTHORITY` behavior in staging.
5. Reconcile `.env.example`, deployment docs, and actual required env variables.
6. Reconcile GitHub remote / repo slug / README deployment references.
7. Finish event management support needed for clean session lifecycle creation if session ops still depend on pre-existing event rows.
8. Add a minimal web-managed policy/settings layer for branch defaults and session overrides.
9. Expand participant operations tooling:
   - VIP
   - richer blacklist controls
   - incident review
10. Add standard rollout templates and SOP/checklist modules.
11. Only after the above, start finance/KPI and executive visibility work.

## Codex Prompt-Writing Rules

Future implementation prompts should always include:

- exact scope lock
- what not to redesign
- explicit acceptance criteria
- exact files likely to touch if known
- permission rules if the task affects admin/branch/session scope
- required output format

Prompt structure should explicitly say:
- do
- do not
- current constraints
- non-goals
- tests required

Every implementation prompt should require the final response to include:
- files modified
- files created
- files deleted
- concise architectural impact
- assumptions made
- remaining technical debt
- tests added or updated

Avoid prompts that ask for:
- broad rewrites
- “clean up everything”
- speculative architecture redesign
- unrelated UX redesign when the task is operational control

## Developer Execution Rules

- Do not hardcode operational values if they are expected to change in normal operations.
- Use hierarchy consistently:
  - global default
  - branch override
  - session override
- Prefer soft-disable over delete for operational entities.
- Never expose `password_hash`, raw secrets, service-role credentials, or signed-session internals to the client.
- Keep customer-facing values separate from internal operational values.
- Every operational mutation should leave audit metadata at minimum:
  - `updated_at`
  - `updated_by`
- Nickname remains display/business data, not authority.
- Customer signed session and admin auth must remain separate.
- Do not widen trust in local storage.
- Do not bypass web-managed operational control with manual code constants unless it is a temporary bootstrap path and clearly documented.

## Launch / Staging / Prod Checklist

### GitHub

- verify actual remote repository slug
- verify branch strategy and deployment source branch
- verify README and deployment docs point to the correct repo

### Vercel

- verify linked project/environment
- verify production and preview env vars
- verify build succeeds on current `main`

### Supabase

- apply `supabase/authority-schema.sql`
- verify `admin_users`, `branches`, `sessions`, `participants`, `reservations`, `blacklist`, `incidents` exist
- verify service role key is configured in deployment env

### Environment variables

Must verify at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MINGLE_ADMIN_SESSION_SECRET`
- `MINGLE_CUSTOMER_SESSION_SECRET`
- `MINGLE_ADMIN_BOOTSTRAP_PASSWORD` or `MINGLE_ADMIN_PASSWORD`
- `USE_DB_AUTHORITY`
- `READ_FROM_DB`

Optional/feature-dependent:
- Firebase vars
- storage vars for R2/S3

### Seed

- run admin seed dry-run
- run admin seed
- verify seeded IDs/emails match expected operational accounts

Commands:
- `npm run seed:admin-users -- --dry-run`
- `npm run seed:admin-users`

### Backfill

- run DB authority backfill dry-run
- verify duplicate report and failure report
- run real backfill against correct authority source

Commands:
- `npm run backfill:db-authority -- --dry-run`
- `npm run backfill:db-authority`

### Admin login test

- verify HQ admin login by email
- verify HQ admin login by id if using id intentionally
- verify branch admin login
- verify disabled admin cannot log in
- verify password reset works from UI

### Customer flow test

- verify QR check-in with current QR contract
- verify check-in success issues customer signed session
- verify re-entry restores same participant context
- verify duplicate nickname remains validation only

### Blacklist test

- verify blacklisted participant is blocked on check-in or customer action as intended
- verify blacklist change persists and is visible to admin tools

### Session revoke test

- verify customer session becomes invalid when `customerSessionVersion` changes
- verify cookie is cleared and customer must re-enter through valid flow

## Open Technical Debt

- file-backed authority still exists and remains part of migration safety
- DB authority still depends on explicit environment switches
- `.env.example` does not yet fully reflect all runtime secrets and flags
- event management is not yet first-class in admin web control
- operational policy/settings CMS is not yet built
- participant operations tooling is still minimal
- VIP tooling is not complete
- incident workflow is still basic
- SOP/templates/checklists are not implemented
- finance/KPI/executive visibility modules are not implemented
- bootstrap password is still env-based for first seed/recovery

## Practical Handoff Notes

- If you are continuing implementation, start from this document first, then inspect:
  - `lib/repositories/`
  - `app/api/admin/`
  - `components/admin/`
  - `supabase/authority-schema.sql`
  - `scripts/seed-admin-users.ts`
  - `scripts/backfill-db-authority.ts`
- If you are operating staging/prod, do not assume login, seed, backfill, or DB flags are already aligned. Verify them explicitly.
