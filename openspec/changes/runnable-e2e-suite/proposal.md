## Why

The Playwright specs have been aligned to the current UI selectors, but the suite has never run
green end-to-end because it assumes pre-seeded users ("first user is admin, password `password`")
that nothing creates. E2e is only worth keeping if `npm run e2e` works on a clean checkout;
otherwise it silently rots (this has already happened twice).

**Decision needed from Árpád:** seeding strategy.
1. **Playwright `globalSetup` seeds via the real API** (bootstrap admin → login → create members
   → create gifts). No backend changes; the seed exercises the same endpoints users hit.
   Recommended.
2. A backend `test`/`e2e` profile that inserts seed data at startup — faster per-run but adds a
   prod-adjacent code path that must never ship enabled.
3. Drop the e2e suite and rely on unit + backend integration tests (legitimate KISS answer for a
   family app).

## What Changes

(Option 1) Add `frontend/src/__tests__/e2e/global-setup.js`: wipe/point the backend at a temp
SQLite file (env var), bootstrap the admin, create the two extra users and sample gifts the specs
assume; wire it into `playwright.config.js` (`globalSetup`, backend `DATABASE_URL` pointing at a
throwaway file). Document `npm run e2e` prerequisites.

## Capabilities

### New Capabilities
- `e2e-test-execution`: one-command, self-seeding Playwright run on a clean checkout.

## Impact

- `playwright.config.js`, new global-setup file, possibly a `.gitignore` entry for the throwaway
  e2e database. No production code changes.
