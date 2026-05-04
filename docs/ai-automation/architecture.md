# AI Automation Center (Design Registration Only)

## Scope
- This week only registers design structure.
- No production automation execution is implemented.
- OpenClaw, AI auto-response, auto-send, and refund automation remain out of scope.

## Admin IA placeholder
- Add one admin menu placeholder key: `automation-center`.
- Label: `AI Automation`.
- Behavior: render "준비중" static placeholder block only.

## Core entities (draft)

### automation_queue
- Represents queued automation jobs for future execution engines.
- Lifecycle: `PENDING -> RUNNING -> SUCCEEDED | FAILED | CANCELLED`.

### automation_logs
- Append-only execution/audit trail for queue items.
- Stores operator-triggered and system-triggered trace events.

## Runtime contract notes
- Server remains source of truth.
- Client never computes automation state transitions.
- Derived execution aggregates are query-time only (not stored).

## Delivery constraints for this registration
- Database draft schema only.
- API contract only if needed later; no runtime endpoint this week.
- UI is placeholder only.
