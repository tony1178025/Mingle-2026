# Mingle-2026 Persistent Development Agent Guide

## Mission

You are the persistent development agent for this repository.
Primary objective: complete Mingle Admin dashboard + Customer PWA toward paid beta readiness without breaking locked architecture/business rules.

## Mandatory Read Order Before Work

1. `AGENT.md`
2. `PROJECT_STATE.md`
3. `ROADMAP.md`
4. `DECISIONS.md`
5. `TASKS.md`
6. `QA_CHECKLIST.md`

## Product Constraints (Locked)

- Do not redesign locked architecture.
- Do not remove existing business rules.
- Korean-first UI.
- Admin UI: clean, bright, functional, low-complexity.
- Customer UI: mobile-first, operationally stable.
- No speculative feature expansion outside active roadmap scope.

## Autonomous Execution Policy

The agent is allowed to execute high-impact operations if all required gates pass.

### Allowed Autonomous Actions

The agent may automatically perform:

- code changes
- tests
- lint/typecheck/build
- DB migrations
- deployment scripts
- environment validation
- external API integration setup
- large refactors
- cleanup of deprecated code

### Restricted but Allowed with Safety Gates

1. DB Migration

Required gates:

- migration file reviewed
- rollback migration exists
- backup command documented
- local/staging migration tested
- no destructive SQL unless explicitly marked

1. Deployment

Required gates:

- lint pass
- typecheck pass
- test pass
- build pass
- env check pass
- deployment target confirmed in config

1. API Keys / Kakao / SMS / Payment

Required gates:

- no secret committed to git
- `.env.example` updated
- runtime env validation exists
- provider sandbox tested before production

1. Data Deletion

Required gates:

- soft delete preferred
- hard delete only with backup
- affected rows preview required
- audit log required

1. Large Refactor

Required gates:

- affected files listed
- public contract unchanged unless documented
- tests updated
- build passes

### Absolute Stop Conditions

Stop immediately if:

- production database target is unclear
- secrets are found in source code
- migration contains DROP/TRUNCATE without backup
- deployment environment is ambiguous
- tests fail and failure reason is unknown

## Automation Scope Clarification

- Development automation: allowed now.
- Business/customer operations automation: remains Phase 4.
- DB/deploy/API/deletion/refactor automation: allowed only with safety gates.

## Working Rules

- On every task iteration, if there is any file change (code/docs/config), update markdown state docs in the same iteration.
- Minimum required updates when changes exist:
  - `PROJECT_STATE.md`
  - `TASKS.md`
- Do not defer markdown state updates to a later turn.
- 문서 업데이트는 의미 있는 변경에 한해 수행한다. (UI 텍스트 변경, 단순 리팩토링은 제외)
- Run verification (`lint`, `typecheck`, `test`, `build`) when feasible.
- If blocked, log:
  - exact blocker
  - affected files
  - next required command

## Skill Working Frame (Locked for Mingle-2026)

Use the following installed skill.fish skills as the active working frame for Mingle-2026:

- ai-first-engineering
- architecture-patterns
- code-reviewer
- coding-agent
- database-migrations
- design-system
- fix-decision-router
- frontend-design
- frontend-patterns
- gh-issues
- github
- github-mcp-server
- korean-frontend-defaults
- mingle-ops
- postgres-patterns
- quality-nonconformance
- security-review
- senior-frontend
- tdd-workflow
- ui-styling
- writing-standards

### Primary source of truth

- mingle-ops
- project documents
- AGENT.md
- PROJECT_STATE.md
- ROADMAP.md
- TASKS.md
- QA_CHECKLIST.md
- docs/Mingle Master Specification (v1.0).md

### Product identity and operating model (non-negotiable)

- Mingle-2026 is not a generic dating app.
- Mingle-2026 is a Korean offline social party live-operations system.
- Operating model:
  - Branch management
  - Session management
  - Session Live Ops
  - Static table QR check-in
  - Customer PWA after QR entry
  - Admin-visible real-time participant state
  - ROUND_1 / ROUND_2 lifecycle
  - secondRoundOptIn handling
  - Admin-controlled table rotation
  - Hearts and mutual matches
  - Reports and safety handling
  - Future reservation/payment/messaging extension

### Priority order

1. Admin Live Ops stability
2. DB/schema/seed authority
3. QR/check-in/session lifecycle correctness
4. Customer PWA usability
5. ROUND_2/rotation/heart logic
6. E2E test stability
7. UI polish
8. Future reservation/payment/messaging automation

### Non-negotiable rules

1. Do not flatten Branch → Session → Live Ops hierarchy.
2. Do not treat the product as a dating app first.
3. Do not mix participant state axes.
4. Presence/activity state and session participation/logout state must remain separate.
5. QR check-in must remain deterministic and session-bound.
6. Phone + session key deduplication must be preserved.
7. ROUND_2 transition must respect secondRoundOptIn.
8. LOGGED_OUT users are not deleted and may rejoin before session end.
9. Table rotation is recommendation-only until admin preview/reshuffle/apply.
10. Korean UX/copy is primary.
11. English must render safely but Korean remains the default.
12. Do not overclaim readiness.
13. Do not call the system pilot-ready or launch-ready unless readiness gates are passed.

### Skill usage policy

- Use mingle-ops for all domain/operation/QR/session/table/round/heart/report/readiness decisions.
- Use architecture-patterns for system/state-model changes.
- Use ai-first-engineering and coding-agent for planning and implementation prompts.
- Use database-migrations and postgres-patterns for DB/schema/seed work.
- Use senior-frontend/frontend-patterns/frontend-design/design-system/ui-styling/korean-frontend-defaults/writing-standards for UI/UX work.
- Use tdd-workflow before changing behavior.
- Use quality-nonconformance to detect mismatch between code and locked operating model.
- Use security-review for auth/admin permissions/QR/phone/profile images/environment variables.
- Use code-reviewer after implementation.
- Use fix-decision-router only after identifying failure type and expected behavior.
- Use github/github-mcp-server/gh-issues for repository workflow.

### Before any change

1. State the current phase.
2. Identify affected files.
3. Identify policy/state-model risks.
4. State what must not be changed.
5. Make the smallest safe change.
6. Add/update tests when touching QR, check-in, session state, participant state, ROUND_2, hearts, reports, or Admin Live Ops.
7. Run or specify verification commands.
8. Update PROJECT_STATE.md, TASKS.md, and QA_CHECKLIST.md when project status changes.