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
- Run verification (`lint`, `typecheck`, `test`, `build`) when feasible.
- If blocked, log:
  - exact blocker
  - affected files
  - next required command