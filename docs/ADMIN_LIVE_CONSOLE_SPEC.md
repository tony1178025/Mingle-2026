# Admin Live Console Spec (2026)

## Design Direction
- Bright operational dashboard for staff readability.
- Group controls by risk level and require confirm for destructive actions.
- Keep live metrics and table state visible without hidden navigation depth.

## Core Panels
- Top KPI bar
- Participant data grid (filter/sort)
- Table map panel with warning signals
- Rotation control panel and preview/apply workflow

## API Basis
- Uses new admin rotation endpoints under `/api/admin/sessions/{sessionId}/rotation/*`.
- Legacy `/api/session/*` commands are compatibility only (DEPRECATED).
