# Customer Onboarding Spec (2026)

## Flow
- 5-step onboarding with per-step partial save.
- Step data is server-saved through `POST /api/customer/profile/step`.
- Finalization uses `POST /api/customer/enter`.

## Required Rules
- Birth year drives derived age on server path.
- Gender is user-selectable.
- Ideal-type ranking stores ordered 3 selections without duplicates.
- Portrait/privacy consent must be explicit before final entry.
- Photo upload failure must not block entry (fallback avatar path).

## Legacy
- Existing command-based completion remains for compatibility but is DEPRECATED for new feature expansion.
