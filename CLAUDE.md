# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Giftpile is a self-hostable family wishlist application. Tech stack (all to be implemented — no code exists yet):

- **Backend**: Java 25, Spring Boot 4.1.0, Maven 3.9+, Spring Data JPA + Hibernate 7.x, Flyway 11, Spring Security 7.x (session auth, BCrypt), Jsoup 1.20.1 (OG parsing)
- **Frontend**: React 19, Vite 6, React Router 7, Node 22 LTS — plain CSS with design tokens, no component library
- **Database**: SQLite (default, via xerial sqlite-jdbc 3.49.1.0) or Postgres (opt-in via `DATABASE_URL` env var)
- **Testing**: JUnit 5 + Testcontainers 1.21.0 (backend); Vitest 3 + React Testing Library 16 + Playwright 1.52 (frontend)
- **Deploy**: Docker Compose (`backend/` + `frontend/` each with a multi-stage Dockerfile)

Project layout: `backend/` (Maven) and `frontend/` (npm/Vite) are independent build roots.

Once code exists, update this file with the actual build/test/run commands.

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
