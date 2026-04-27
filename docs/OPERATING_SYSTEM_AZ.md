# Operating System A-Z

## Role Split
- Customer PWA: entry, onboarding, participant/table/content/me, match/contact.
- Branch Admin: same-day operation, session lifecycle, check-in/live/QR, inventory/expenses/close report.
- HQ Admin: cross-branch business management, finance/analytics/settings/integrations.

## Module Policy
- Core runtime path remains customer + branch live operation.
- Future modules (inventory COGS, labor, ROAS, channel PnL, LTV) are pre-wired as optional services.
- Missing data never blocks operations: all finance/analytics routes return `0`, `[]`, or `null` safely.

## API Surfaces
- Branch: `/api/branch/*`
- HQ: `/api/hq/*`
- Customer: `/api/customer/*`
- Admin legacy: `/api/admin/*` compatibility

## Null-safe Priority
- Inventory COGS: actual movement -> usage rules -> cogs per person -> 0.
- Labor: shifts -> manual labor entries -> labor per session -> 0.
- ROAS: ad spend + attribution linked revenue; no spend => `roas: null`.
- Channel PnL/LTV: empty source data returns empty-safe aggregates.
