## 1. Decide

- [ ] 1.1 Árpád: seed via API in globalSetup (recommended), backend seed profile, or drop e2e?

## 2. Implement (globalSetup variant)

- [ ] 2.1 `playwright.config.js`: backend webServer gets `DATABASE_URL=jdbc:sqlite:<tmp>/e2e.db`
      so runs start from an empty database; add `globalSetup`.
- [ ] 2.2 `global-setup.js`: bootstrap admin (password `password`), create the second/third users
      and the sample gifts the specs reference — all through the public API.
- [ ] 2.3 Align spec fixtures with the seed (names, counts) and remove "adjust to your backend"
      comments.
- [ ] 2.4 Run `npm run e2e` headless until green; fix residual selector drift.
- [ ] 2.5 Document in README (Playwright browsers install step: `npx playwright install`).
