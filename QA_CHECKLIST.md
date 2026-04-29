# QA Checklist

## Mandatory Validation Loop

Run all:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

If any fails:
- identify failing file/test
- apply fix
- rerun from lint

## Customer PWA Checks (Korean-first, mobile-first)

- [ ] QR check-in succeeds with valid code
- [ ] invalid/revoked/expired/disabled QR is blocked with clear message
- [ ] duplicate participant creation is blocked
- [ ] profile onboarding completes and session cookie is issued
- [ ] participant list loads and tableLabel rendering is stable
- [ ] heart send flow works and failure messages are clear
- [ ] report submission works and appears in admin reports

## Admin Checks (clean, bright, low-complexity)

- [ ] session lifecycle controls work (ROUND_1/BREAK/ROUND_2/CLOSED)
- [ ] dangerous actions require confirm
- [ ] QR regenerate updates active code and revokes prior active code
- [ ] content panel controls do not break customer state sync
- [ ] reports panel resolve/block flows work
- [ ] audit logs are recorded for major mutations

## Safety Gate Checks (high-impact)

### DB Migration
- [ ] migration reviewed
- [ ] rollback available
- [ ] backup command documented
- [ ] no destructive SQL without explicit marker

### Deployment
- [ ] lint pass
- [ ] typecheck pass
- [ ] tests pass
- [ ] build pass
- [ ] target env confirmed

### External API
- [ ] no secrets in git
- [ ] env validation added
- [ ] sandbox test evidence

### Data Deletion
- [ ] affected rows preview
- [ ] backup command
- [ ] audit trail note
