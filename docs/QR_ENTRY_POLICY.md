# QR Entry Policy (2026)

## Core Policy
- QR is table-based only: `/customer?branchId={branchId}&tableId={tableId}`.
- QR never includes sessionId, version, or one-time token.
- Server validates branch/table existence and resolves current OPEN session.

## API
- `GET /api/customer/entry`
  - `OK`: branch/table/session context available
  - `NO_OPEN_SESSION`: no active session in branch
  - `INVALID`: invalid branch/table contract

## Legacy
- `POST /api/reservations/session-context` is DEPRECATED.
- Legacy route is compatibility layer only and must not receive new features.
