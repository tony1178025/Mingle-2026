# Alignment Audit Report

## Source-of-Truth baseline checked

- `.cursor/Cursor_Mingle_First_Command_260413_0614.md`
- `.cursor/Mingle_Background_Knowledge_260413_0614.md`
- `docs/background/INDEX.md`
- `docs/background/SUMMARY.md`

## Stayed aligned

- Korean on-site party ops product direction is preserved (`customer` PWA + `admin` PC web).
- Check-in supports QR / 4-digit code / staff fallback.
- Profile field scope stays constrained (nickname, age, job category/job, optional photo, height, animal, E/I).
- Heart pricing is fixed at 5,000 KRW and not gender-differentiated.
- Reveal gate is implemented exactly as required:
  - `phase === ROUND_2`
  - `admin reveal toggle === ON`
  - `usedFreeHearts >= freeHeartLimit (3)`
- Heat remains admin-facing signal; customer does not get Heat exposure.
- Customer explore remains table-first.
- Rotation workflow remains preview -> apply with audit log.

## Drift / omissions found

- Audit logs used a hardcoded session id in `createAuditLog`, risking wrong audit linkage in multi-session operation.
- Profile completion checked presence only; explicit age/height policy range was not enforced server-side/state-side.
- Content system was safe but rigid: static card list without explicit phase activation metadata.
- Revisit probability visibility was implicit, not surfaced as deterministic operator-ready signal.

## Corrections applied

- Added session-aware audit logging path:
  - `createAuditLog(..., sessionId?)` now accepts explicit session id.
  - All critical callsites now pass `snapshot.session.id`.
- Added strict profile guardrail validation in onboarding:
  - age 20-40
  - height 140-210 cm
- Upgraded content modeling:
  - added content primitives + activation metadata (`round1-only`, `post-rotation`, `round2-only`)
  - added phase eligibility resolver and customer rendering that distinguishes `LIVE / 대기 / 준비`.
- Added deterministic revisit-likelihood estimator and integrated it into intervention recommendations.

## Directional check

- No unapproved product direction change was introduced.
- No reveal-rule drift was introduced.
- Table-based customer exploration remains intact.
- Admin remains operational cockpit, not report-only page.

