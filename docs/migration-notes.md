# Migration Notes

## What changed from the prototype

- Replaced ad-hoc JSX fragments with a Next.js App Router scaffold.
- Moved session logic out of scattered local state into a single Zustand store with slice boundaries.
- Replaced random/mock-first inline behavior with a repository-backed snapshot model.
- Rebuilt customer UX around tables instead of flat participant lists.
- Rebuilt admin UX into a live cockpit instead of a static dashboard mock.
- Upgraded reveal logic to the exact final rule set.
- Replaced placeholder rotation behavior with a preview/apply engine flow.

## How to swap demo mode for production

1. Replace `LocalStorageMingleRepository` in `lib/mingle.ts` with a Supabase-backed repository.
2. Keep the same `SessionSnapshot` shape in store actions to minimize UI churn.
3. Map DB rows from `types/mingle.ts` snake_case contracts into domain records.
4. Replace `startSessionPolling` with Supabase Realtime or websocket subscriptions.
5. Keep engine functions pure and server-safe so preview generation can move to an API route or Edge/Node function later.

## What not to regress

- Do not expose heat to customers.
- Do not weaken reveal rules.
- Do not re-expand full MBTI.
- Do not switch customer explore back to a flat list-first model.
- Do not skip rotation preview before apply.
- Do not remove audit logging from admin actions.
