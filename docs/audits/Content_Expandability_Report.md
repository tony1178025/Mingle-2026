# Content Expandability Report

## Current state before changes

- Content was represented as a static list (`id/title/subtitle/detail`) and active id list.
- No explicit phase activation semantics in the content model.
- UI had to infer behavior with ad-hoc checks, which can become brittle as content grows.

## Risk assessment

- Not blocked for small additions, but prone to drift when adding:
  - round-specific activations
  - mixed primitive types (prompt/poll/card/vote)
  - admin packs and scheduling rules

## Changes applied now (minimal safe upgrade)

- Introduced explicit content metadata:
  - `primitive`: `prompt | poll | card | vote`
  - `activation`: `all | round1-only | post-rotation | round2-only`
- Added deterministic phase eligibility resolver:
  - `isContentEligibleForPhase()`
- Added derived view model:
  - `buildActiveContentView(contentIds, phase)`
- Updated customer content UI to show:
  - `LIVE` (admin activated + phase eligible)
  - `대기` (admin activated, but not phase-eligible now)
  - `준비` (not activated)

## Should we do full registry system now?

- **Not yet** for this iteration.
- Current upgrade is enough to avoid near-term growth blockage without overengineering.

## Recommended next step

- When content count exceeds current scale, add:
  - config-driven registry persisted in backend
  - admin content-pack presets
  - reusable primitive renderer contracts
  - per-phase/policy validation in backend

