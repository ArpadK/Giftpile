# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Giftpile is a self-hostable family wishlist application. Family members keep gift lists; others
secretly "claim" gifts to give. Core invariant: the owner of a list (and an admin editing it)
never sees claim data, and gifts claimed by someone else are hidden from other viewers.

- **Backend** (`backend/`, Maven): Java 25, Spring Boot 4.1.0, Spring Data JPA + Hibernate 7,
  Spring Security 7 (session auth, BCrypt), Jsoup (link-preview scraping), Jackson 3
  (`tools.jackson` packages — not `com.fasterxml`).
- **Frontend** (`frontend/`, npm/Vite): React 19, Vite 6, React Router 7 — plain CSS with design
  tokens (`src/tokens.css`), no component library. All API calls go through `src/lib/api.js`.
- **Database**: SQLite file by default (`jdbc:sqlite:giftpile.db`); Postgres opt-in via
  `DATABASE_URL` + `DB_DIALECT` env vars. Schema managed by **Flyway** (`V1__init.sql` runs on
  both databases). `baseline-on-migrate=true` so existing databases (pre-Flyway) upgrade cleanly.
- **Design reference**: `design_handoff_gift_list_app/` (HTML prototype + screenshots + README).
  Treat it as the source of truth for visuals; the app is the "Giftly" design rebranded Giftpile.

## Commands

Backend (from `backend/`):
- `mvn test` — full suite. H2-based controller/service tests need no Docker; `IntegrationTestBase`
  subclasses use Testcontainers/Postgres and do need Docker.
- `mvn spring-boot:run` — dev server on :8080 (creates `giftpile.db` in the working dir).

Frontend (from `frontend/`): **requires Node 22 — run `nvm use` first** (the default shell node
may be an ancient version that breaks npm/vite).
- `npm run dev` — Vite on :5173, proxies `/api` to :8080.
- `npm test` / `npx vitest run` — unit tests.
- `npm run build` — production build.
- `npm run e2e` — Playwright (starts both servers per `playwright.config.js`; assumes seeded users).

Full stack: `docker compose up --build` → http://localhost:8080 (backend serves the built SPA;
SQLite on a named volume). Postgres variant: `docker compose --profile postgres up --build`.

First run: the app has no users; the `/` screen shows a create-admin form (bootstrap endpoint
`POST /api/auth/users` works only while the users table is empty and always creates an admin).

## Conventions

- KISS is the guiding principle: no speculative abstractions, delete dead code, prefer the
  boring solution.
- API errors always return `{ "message": "..." }` (see `ApiExceptionHandler` + `ErrorResponse`);
  controllers throw `NotFoundException` / `ForbiddenException` / `IllegalArgumentException`
  instead of hand-building error responses. The frontend surfaces `error.message` from
  `src/lib/api.js`.
- Request/response DTOs are Java records; request records live as nested types in their controller.
- Gift visibility rules live in ONE place per side: `GiftVisibilityService` (backend). Don't
  duplicate them.

## Spec-driven workflow (OpenSpec)

This project uses OpenSpec for spec-driven development (`openspec/config.yaml`, `schema: spec-driven`).
Non-trivial changes are expected to flow through OpenSpec artifacts (proposal → design → specs →
tasks → implementation → archive) rather than being written ad hoc.

Use the OpenSpec skills / `/opsx` commands to drive this:
- `openspec-explore` (`/opsx:explore`) — think through an idea before committing to a change.
- `openspec-propose` (`/opsx:propose`) — create a change with all artifacts in one step.
- `openspec-apply-change` (`/opsx:apply`) — implement the tasks of a change.
- `openspec-sync-specs` (`/opsx:sync`) — sync delta specs into the main specs.
- `openspec-archive-change` (`/opsx:archive`) — finalize and archive a completed change.

Project-wide context and per-artifact rules for OpenSpec live in `openspec/config.yaml`.

## Git

Do not run `git add`, `git commit`, or `git push`. The user reviews all diffs and handles all
git operations manually.
