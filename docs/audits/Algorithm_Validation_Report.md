# Algorithm Validation Report

## Current algorithm quality judgment

- **Status**: needs tuning (not structural rewrite).
- Core structure (tiering + preview/apply + repeat-avoidance + balance constraints) is directionally correct for Mingle.
- Main gaps were explainability and operational signals rather than total algorithm failure.

## What remains valid

- A/B/C + sub-tier classification and protected participant concept.
- Rotation preview/apply separation with auditable impact deltas.
- Repeat meeting penalty and table quality balancing.
- Round-2 reveal gating independent from timer.

## Weak points found

- Revisit probability signal was not explicit for operators.
- Dropout-risk recommendations were binary and did not expose confidence/intensity.
- `profileViews` can carry noisy social-signal bias if over-interpreted as quality.

## Changes made

- Added deterministic revisit estimator (`engine/revisit/index.ts`):
  - inputs: received/sent/profileViews, repeat meetings, table heat, protection
  - outputs: `score (0-100)` + `bucket (HIGH/MEDIUM/LOW)`
- Integrated revisit score into intervention engine:
  - dropout recommendation now includes revisit score
  - priority escalates to HIGH when revisit bucket is LOW

## Business-fit assessment

- **Revisit probability**: now explicitly monitored in intervention recommendations.
- **A-tier protection vs hopelessness risk**: still balanced by distribution penalties + low-engagement rescue incentives.
- **Fairness**: preserved through gender/EI/repeat penalties and preview diff visibility.
- **Monetization support**: still aligned through free-heart usage + paid-heart fallback.
- **E/I weight fit**: moderate, not dominant; still suitable for conversational dynamics.
- **profileViews usefulness**: retained, but now context-limited via revisit scoring and intervention framing.
- **Repeat-meeting avoidance**: preserved.
- **Cold/hot handling**: preserved and now connected to revisit warning context.
- **Dropout protection**: improved with explicit revisit risk signal.

## Final recommendation

- Keep current architecture and rotation model.
- Continue iterative weight tuning from live data rather than replacing with black-box optimization.

