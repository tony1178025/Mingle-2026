# Deploy Gate And Rollback

## Mandatory Gate

Run in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

If any step fails, do not deploy.

## Smoke Checklist

After deployment:

1. `/customer` loads and check-in QR validation works.
2. `/admin` auth guard works.
3. Admin session phase transition works.
4. Table QR regenerate works and new code is reflected.
5. Content tab loads and submit actions return 200.
6. Heart send and report submit return 200.

## Rollback

1. Identify last green commit SHA.
2. Redeploy previous SHA.
3. Verify smoke checklist again.
4. Mark rollback reason in release note and incident log.
