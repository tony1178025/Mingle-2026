# Bug / Risk Report

## Fixed in this pass

- **Audit session contamination risk**
  - problem: audit logs were created with hardcoded session id.
  - impact: multi-session environments can mix operational history.
  - fix: session-aware `createAuditLog(..., sessionId?)` and callsite updates.

- **Profile policy enforcement gap**
  - problem: profile completion validated required fields but not range policy.
  - impact: out-of-policy age/height can enter state and break business rules.
  - fix: strict validation in checkin/profile flow:
    - age 20-40
    - height 140-210 cm

- **Content phase drift risk**
  - problem: content activation had no explicit phase metadata.
  - impact: future content can activate in wrong round and drift from intended experience pacing.
  - fix: activation metadata + phase eligibility checks + UI status separation.

- **Dropout visibility weakness**
  - problem: dropout risk was coarse and operator signal lacked confidence level.
  - impact: delayed intervention decisions during live operation.
  - fix: deterministic revisit-likelihood score integrated into intervention recommendations.

## Remaining notable risks

- Seed-based repository is still demo-safe architecture, not live-event production infra.
- Real-time multi-device sync still depends on external backend transport behavior.
- Fraud/abuse hardening (rate limits, stronger identity checks) still needs backend layer.
