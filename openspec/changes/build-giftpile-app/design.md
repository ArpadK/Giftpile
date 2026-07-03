## Context

Giftpile is a self-hosted family wishlist app. The design handoff (`design_handoff_gift_list_app/README.md`) specifies the full data model, screens, interactions, and visual design tokens. The prototype (`Giftly.dc.html`) is the behavioral reference. This design covers the architecture for a production-quality implementation.

## Goals / Non-Goals

**Goals:**
- Zero-config self-hosting via SQLite; Postgres opt-in via `DATABASE_URL` env var.
- Full fidelity to the design handoff (colors, typography, spacing, animations).
- Correct implementation of the reveal rule (claim hiding, auto-receive, blind context) as a server-side concern — not trusted client logic.
- Maintainable monorepo with independent backend and frontend build systems.

**Non-Goals:**
- Drag-and-drop gift reordering (up/down buttons only).
- Email, OAuth, or external identity providers.
- Multi-family / multi-tenant isolation.
- Native mobile apps (responsive web only).

## Decisions

### 1. Project layout: `backend/` + `frontend/` subdirectories

Both are independent build roots in the same repository.
- `backend/` — Maven project (`pom.xml` at root of `backend/`). Spring Boot 4.1.0, Java 25.
- `frontend/` — npm/Vite project (`package.json` at root of `frontend/`). Node 22 LTS, React 19, Vite 6, React Router 7.

**Why**: Simplest layout for a two-tier app. No need for a root build system (Gradle multi-project, nx, Turborepo) at this stage — the two pieces are started independently during development and shipped together only at deploy time.

### 2. Database: JPA + Flyway 11, SQLite default / Postgres opt-in

`DATABASE_URL` env var selects the driver and Hibernate dialect:
- Absent / `jdbc:sqlite:…` → Xerial SQLite JDBC 3.49.1.0 + `SQLiteDialect` (Hibernate 7.x community dialect).
- `jdbc:postgresql:…` → PostgreSQL JDBC (version managed by Spring Boot 4.1.0 BOM) + `PostgreSQLDialect`.

Flyway 11 migration scripts live in `db/migration/` using ANSI SQL compatible with both dialects where possible; dialect-specific scripts use Flyway's `{vendor}` placeholder suffix (`V1__init.sql` works for both; vendor overrides in `db/migration/sqlite/` or `db/migration/postgresql/` if needed). Flyway 11 requires the `flyway-database-sqlite` plugin artifact alongside `flyway-core` for SQLite support.

**Why not** a JPA `@Embedded` for Claim: non-repeatable gifts have at most one claim, but repeatable gifts can have multiple simultaneous claims — a separate `claims` table is the natural fit and makes visibility queries straightforward.

### 3. Claim as a separate table

```
claims(id, gift_id FK, claimer_user_id FK, gift_date DATE)
```

A non-repeatable gift (`only_once = true`) enforces a unique constraint on `gift_id` at the application layer (checked before insert). A repeatable gift allows multiple rows with the same `gift_id`.

**Active claim** for non-repeatable: the single row in `claims` for that gift, if any.
**Revealed**: `today > gift_date` and `only_once = true` → the gift auto-resolves to received on the backend response (no DB write needed; the API computes `effectiveReceived` at read time).

### 4. Gift visibility as a backend service

`GiftVisibilityService.filterForViewer(gifts, viewerId, ownerId, isBlindContext)` runs on the server and returns only the gifts the viewer is allowed to see. The frontend never receives hidden claim data or hidden gifts.

**Why**: The reveal rule must not be trusted to the client. The backend controls what is in the response payload. No risk of a client seeing claim data for someone else's gift.

- Blind context: `isBlindContext = (viewerId == ownerId) || (isAdmin && adminEditingOwnerId == ownerId)` — claim fields are stripped from the response.
- Non-repeatable, claimed by someone else: gift is absent from response entirely.
- Repeatable: the viewer's own claim (if any) is returned; others' claims are not.

### 5. Session-based auth (Spring Security + bcrypt)

`HttpSession` backed by the servlet container (in-memory for SQLite single-instance). Spring Security `UserDetailsService` loads users from the DB; `BCryptPasswordEncoder` for all password hashing.

**Why not JWT**: A local family app with a single server has no need for stateless tokens. Sessions are simpler to revoke and debug.

Login flow:
1. `GET /api/users` → list of users (id, name, color only; no password data).
2. `POST /api/auth/login { userId, password }` → sets session cookie; returns current user.
3. `POST /api/auth/logout` → invalidates session.
4. All other endpoints require an active session.

### 6. Frontend state management: React Context + fetch

`AuthContext` holds the current user (loaded from `GET /api/me` on mount). All API calls use `fetch` with `credentials: 'include'` for cookie-based sessions. No Redux or Zustand — the data model is simple enough for prop-drilling plus a single auth context.

**Why**: Avoids dependency overhead for a small app. If the state grows complex, Zustand can be dropped in without restructuring.

### 7. CSS design tokens as CSS custom properties

All design tokens from the handoff live in a single `tokens.css` file as CSS `--var` declarations on `:root`. Components import `tokens.css` and reference variables. No CSS-in-JS, no Tailwind.

**Why**: The handoff specifies exact hex values, shadow strings, and radii. CSS variables map 1:1 to the spec, are inspectable in devtools, and are trivially overridden for future theming.

### 8. Link preview proxy on the backend

`GET /api/link-preview?url=<encoded-url>` fetches the target URL server-side using Jsoup 1.20.1, parses OpenGraph `og:image` (and falls back to `twitter:image`), and returns `{ imageUrl: "..." | null }`. A simple in-memory LRU cache (100 entries, 1h TTL) avoids refetching the same URL repeatedly.

**Why proxy**: Browsers cannot fetch arbitrary cross-origin HTML for OG parsing. A backend proxy is the standard solution. Keeping it minimal (image URL only, no full OG metadata) limits response surface area.

## Risks / Trade-offs

- **SQLite concurrency**: SQLite allows only one writer at a time. For a family of ~10 users on a local network, this is acceptable. If load increases, `DATABASE_URL` switch to Postgres resolves it without code changes.
- **Session persistence on restart**: In-memory sessions are lost on server restart, logging out all users. For a local self-hosted app this is a minor inconvenience. Mitigated by Spring Session + JDBC store (stores sessions in the DB) as a future opt-in.
- **Link preview proxy abuse**: The proxy could be misused to fetch internal-network URLs. Mitigation: validate the URL scheme is `http(s)` and optionally check the host is not a private IP range (RFC 1918 + loopback).
- **Flyway dialect parity**: Not all SQL features are identical between SQLite and Postgres. Risk of a migration that works on one failing on the other. Mitigation: keep initial schema ANSI SQL; test both dialects in CI when CI is added.

## Migration Plan

Greenfield — no existing data or schema to migrate. First deploy creates the schema via Flyway `V1__init.sql`.

## Open Questions

- Should the `priority` field use integer ordering (1, 2, 3…) with gap-based reorder, or dense renumbering on every move? (Recommendation: dense renumbering on move — the list is short and it avoids fractional index complexity.)
- Should session storage be in-memory (simpler) or JDBC-backed (survives restarts) from day one? (Recommendation: in-memory for v1; JDBC store as a later config option.)
