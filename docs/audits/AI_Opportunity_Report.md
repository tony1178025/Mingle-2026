# AI Opportunity Report

## Implement now

- None in critical decision loop by default.
- Keep core matching/reveal/rotation deterministic for safety, explainability, and operator trust.

## Prepare now, enable later

- **Operator recommendations augmentation**
  - keep deterministic base, optionally add AI text summaries per table/risk cluster.
- **Report classification assist**
  - classify report reason/details into urgency categories for operator queueing.
- **Post-event analytics summarization**
  - generate operator recap (what worked, where drop risk concentrated).
- **Revisit likelihood support**
  - keep deterministic score as primary; add AI narrative layer later if needed.
- **Intervention suggestion wording**
  - AI can draft tone-adjusted intervention scripts for staff, but not decide policy.

## Not recommended

- Black-box matching core replacing deterministic rotation constraints.
- Emotional-state inference as a primary decision input.
- AI-driven reveal timing automation without operator confirmation.

## Why this split

- Mingle is a live operational system where mistakes are social and immediate.
- Deterministic logic preserves auditability and accountability.
- AI is valuable as a summarization and support layer, not a hidden policy engine.

