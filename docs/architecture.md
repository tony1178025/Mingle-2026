# Mingle Architecture

## Active runtime shape

- `app/customer/page.tsx`: customer-facing PWA entry
- `app/admin/page.tsx`: admin operations cockpit entry
- `components/customer/CustomerApp.tsx`: table-centric customer flow
- `components/admin/AdminDashboard.tsx`: live operations console
- `stores/useMingleStore.ts`: Zustand store with session, check-in, participant, admin, and UI slices
- `engine/*`: pure business logic for scoring, tiering, reveal, heat, intervention, and rotation
- `lib/mingle.ts`: demo seed, local repository, audit helpers, polling boundary, constants
- `lib/supabase/client.ts`: lazy browser client boundary for future Supabase wiring
- `lib/realtime/polling.ts`: polling abstraction for session sync

## State model

- Source of truth during demo mode is a local snapshot repository backed by `localStorage`.
- UI state such as selected table, active tab, and current viewer lives in Zustand.
- Domain state mutations always flow through store actions:
  - check-in verification
  - profile completion
  - heart send / admin heart grant
  - phase change
  - reveal toggle
  - rotation preview / apply
  - report submission

## Engine model

- Scoring:
  - attraction uses received hearts and profile views
  - engagement uses sent hearts and received hearts
- Tiering:
  - A / B / C segmentation by ranked score
  - HIGH / MID / LOW subtier within each tier
- Heat:
  - admin-only signal from sent + received heart activity
- Reveal:
  - `ROUND_2` + admin toggle ON + all 3 free hearts used
- Rotation:
  - classify participants
  - build table capacity plan
  - score placements using gender balance, E/I balance, novelty, protection, repeat-meeting penalty
  - preview before apply
  - apply writes new table assignments and extends `metParticipantIds`

## Design system

- Primary customer palette is deep violet + rose pulse + restrained gold
- Admin palette is neutral light with strong state accents
- Typography:
  - `Noto Sans KR` for Korean UI reliability and legibility
  - `Cormorant Garamond` for premium English brand accents
- Motion:
  - hover lift on table cards
  - heart send press animation
  - section enter transitions
  - reveal card unlock transition
  - admin preview/apply feedback via animated cards and toast

## Backend readiness notes

- `types/mingle.ts` keeps:
  - domain contracts
  - snake_case DB row contracts
  - API response contracts
- Current repository is local/demo-first, but the UI talks to a repository interface rather than random inline mocks.
- Supabase browser client is intentionally lazy-initialized to stay compatible with future App Router production builds.

