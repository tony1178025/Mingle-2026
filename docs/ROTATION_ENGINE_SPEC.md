# Rotation Engine Spec (2026)

## Runtime Path
- Preview: `POST /api/admin/sessions/{sessionId}/rotation/preview`
- Apply: `POST /api/admin/sessions/{sessionId}/rotation/apply`
- Runner path: `rotation-runner -> worker -> fallback(engine)`

## Constraints
- ROUND_1 rotation upper bound: 2
- ROUND_2 rotation upper bound: 1
- Participants with blocked/inactive status are excluded by snapshot status logic.

## Redis/Realtime
- Preview cache key: `session:{sessionId}:rotation:preview` (TTL 5 minutes)
- Broadcast events:
  - `rotation:previewed`
  - `rotation:applied`
  - `participant:tableChanged`

## Compatibility
- Legacy admin command route remains available but is DEPRECATED for new work.
