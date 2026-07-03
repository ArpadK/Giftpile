## 1. Project Scaffolding

- [x] 1.1 Create `backend/` Maven project: `pom.xml` with `spring-boot-starter-parent 4.1.0` as parent, `<java.version>25</java.version>`, `--enable-preview` compiler arg; add managed dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `flyway-core` + `flyway-database-sqlite` (Flyway 11.x), `org.xerial:sqlite-jdbc:3.49.1.0`, `org.postgresql:postgresql` (version managed by Spring Boot BOM), `org.jsoup:jsoup:1.20.1`
- [x] 1.2 Create `backend/src/main/resources/application.properties`: default SQLite datasource (`jdbc:sqlite:giftpile.db`), Hibernate dialect auto-detect from `DATABASE_URL` env var (override datasource URL when set), Flyway enabled
- [x] 1.3 Create `frontend/` Vite + React project (`npm create vite@6 frontend -- --template react`; requires Node 22 LTS); pin React 19, Vite 6 in `package.json`; install `react-router-dom@7` for routing
- [x] 1.4 Create `frontend/src/tokens.css` with all CSS custom properties from the design handoff (colors, typography sizes, radii, shadows, spacing)
- [x] 1.5 Import `tokens.css` in `frontend/src/main.jsx` (global); set `box-sizing: border-box` and default background/font via `:root` styles

## 2. Database Schema & Core Backend

- [x] 2.1 Write Flyway migration `V1__init.sql`: create `users` table (id INTEGER PK, name TEXT NOT NULL, password_hash TEXT NOT NULL, is_admin BOOLEAN NOT NULL DEFAULT 0, color TEXT NOT NULL), `gifts` table (id, owner_id FK, title, link, price, description, exact_color, exact_product, only_once, manual_received, priority INTEGER), `claims` table (id, gift_id FK UNIQUE for only_once enforced at app layer, claimer_user_id FK, gift_date DATE)
- [x] 2.2 Create JPA entities: `User`, `Gift`, `Claim` with proper `@Entity`, `@Column`, and `@ManyToOne` mappings; add `@Table` constraints; keep Claim as a separate entity (not embedded)
- [x] 2.3 Create Spring Data JPA repositories: `UserRepository`, `GiftRepository` (with `findByOwnerId`), `ClaimRepository` (with `findByGiftId`, `findByClaimerUserIdAndGiftId`, `deleteByClaimerUserId`)
- [x] 2.4 Implement `GiftVisibilityService.filterForViewer(List<Gift>, Long viewerId, Long ownerId, boolean isBlindContext)`: strips claim data in blind context, removes non-repeatable claimed-by-others gifts, computes `effectiveReceived` (today > claim.date && onlyOnce), exposes only viewer's own claim for repeatable gifts

## 3. Auth — Login Flow (end-to-end)

- [x] 3.1 Configure Spring Security: permit `GET /api/users` and `POST /api/auth/login` unauthenticated; require authentication on all other `/api/**`; disable CSRF (SPA with cookie session); configure `BCryptPasswordEncoder`; `UserDetailsService` loads users by id from DB
- [x] 3.2 Implement `GET /api/users` → returns list of `{ id, name, color }` (no password data)
- [x] 3.3 Implement `POST /api/auth/login { userId, password }` → validates credentials, creates HttpSession, returns `{ id, name, color, isAdmin }`; returns 401 on failure
- [x] 3.4 Implement `POST /api/auth/logout` → invalidates session, returns 200
- [x] 3.5 Implement `GET /api/me` → returns current user `{ id, name, color, isAdmin }` or 401
- [x] 3.6 Frontend: create `AuthContext` + `useAuth` hook; on app mount call `GET /api/me` to restore session; expose `{ currentUser, login, logout }`
- [x] 3.7 Frontend: build User-select screen — centered column, logo lockup (gift-box inline SVG + "Giftpile" wordmark), "Who's this?" subhead, one `UserRow` per user (avatar, name, chevron); tap navigates to password step
- [x] 3.8 Frontend: build Password step — "Not {name}?" back link, avatar + "Hi, {name}" heading (Manrope 800, 22px), password input, error text, "Sign in" button; on success navigate to Home
- [x] 3.9 Frontend: route guard — redirect unauthenticated users to user-select; authenticated users skip user-select

## 4. Home Screen

- [x] 4.1 Backend: `GET /api/users/{id}/gifts/count` → returns `{ activeCount: N }` (count of non-received gifts for that owner)
- [x] 4.2 Frontend: build Home screen — sticky top bar with "Hi, {name}" and logout icon (logout icon only on Home); large primary "My gift list" CTA card (rounded 20px, white icon badge, "My gift list" title, "{n} active ideas" subtext, chevron, CTA shadow); "Family" section label; one `UserRow` per other family member with "{n} ideas" subtext; "Manage" section with Admin row (amber badge, shield icon) for admins only

## 5. Gift Management — My List (end-to-end)

- [x] 5.1 Backend: `GET /api/users/{id}/gifts` (owner viewing own list) → applies blind context via `GiftVisibilityService`; returns active gifts sorted by priority, then received gifts
- [x] 5.2 Backend: `POST /api/gifts` `{ ownerId, title, link?, price?, description?, exactColor, exactProduct, onlyOnce }` → creates gift at priority = max+1; returns created gift
- [x] 5.3 Backend: `PUT /api/gifts/{id}` → updates editable fields; owner or admin only (403 otherwise)
- [x] 5.4 Backend: `DELETE /api/gifts/{id}` → deletes gift and its claims; owner or admin only
- [x] 5.5 Backend: `PATCH /api/gifts/{id}/received` `{ received: boolean }` → toggles `manualReceived`; owner or admin only
- [x] 5.6 Backend: `PATCH /api/gifts/{id}/priority` `{ direction: "up" | "down" }` → swaps priority with adjacent active gift; owner or admin only
- [x] 5.7 Frontend: build `GiftCard` component (active state) — optional 140px cover image, title + price chip, description, "View item ↗" link, tag chips (exact-color: violet, exact-product: violet, repeatable: teal), action row (move-up, move-down, spacer, edit, mark-received, delete icon buttons)
- [x] 5.8 Frontend: build `GiftFormModal` bottom-sheet — fields: Title, Link, Price, Notes, three checkboxes; validates title required; `onSave` callback; used for both add and edit
- [x] 5.9 Frontend: build `GiftDeleteConfirmModal` — shows gift title, lightweight Yes/Cancel
- [x] 5.10 Frontend: build My List screen — "+ Add a gift idea" pill button; active gift stack with `GiftCard`; "Show/Hide received gifts" toggle (hidden when no received gifts); received section at 60% opacity with "Undo" pill and delete button per card
- [x] 5.11 Frontend: wire up all My List actions (add, edit, delete, mark received, undo received, move up/down) to respective backend endpoints with optimistic UI updates

## 6. Other Member's List & Gift Claiming (end-to-end)

- [x] 6.1 Backend: `GET /api/users/{id}/gifts` (viewer ≠ owner) → applies full visibility rules via `GiftVisibilityService`; returns visible active and received gifts with viewer's own claim data included (but not others')
- [x] 6.2 Backend: `POST /api/gifts/{id}/claim` `{ giftDate: "YYYY-MM-DD" }` → creates claim for current user; returns 409 if non-repeatable gift already claimed by another user
- [x] 6.3 Backend: `PUT /api/gifts/{id}/claim` `{ giftDate: "YYYY-MM-DD" }` → updates current user's existing claim date
- [x] 6.4 Backend: `DELETE /api/gifts/{id}/claim` → removes current user's claim on the gift
- [x] 6.5 Frontend: build Other Member's List screen — same `GiftCard` visuals minus edit controls; unclaimed gifts show "I'll get this one" primary button; viewer's own claimed gifts show struck-through title, green info bar with date, "Edit" pill; "Show received gifts" toggle for received section
- [x] 6.6 Frontend: build `ClaimModal` bottom-sheet — gift title heading, helper copy, native date input, "Confirm — I'll give this" / "Update date" primary button; "I didn't give this after all" red button (edit mode only)
- [x] 6.7 Frontend: wire up claim, update-claim, and un-claim actions to backend; refresh gift list on success

## 7. Admin Panel (end-to-end)

- [x] 7.1 Backend: `GET /api/admin/users` → returns all users (admin only); includes `isAdmin` flag
- [x] 7.2 Backend: `POST /api/admin/users` `{ name, password, isAdmin }` → creates user; assigns color from rotation sequence based on current user count; returns created user
- [x] 7.3 Backend: `PUT /api/admin/users/{id}` `{ name, password?, isAdmin }` → updates user; rehashes password only if provided; returns 400 on last-admin demotion
- [x] 7.4 Backend: `DELETE /api/admin/users/{id}` → validates not self-delete and not last admin; cascades delete of gifts and claims made by that user; returns 400 with message on guardrail violations
- [x] 7.5 Backend: `GET /api/admin/users/{id}/gifts` → returns target user's gifts in blind context (admin-edit mode)
- [x] 7.6 Frontend: build Admin panel screen — "+ Add family member" pill; one user card per user (avatar, name, "Admin" label if applicable, edit button, delete button, "View / edit their list" button)
- [x] 7.7 Frontend: build `UserFormModal` — fields: Name, Password (placeholder "Leave blank to keep current" on edit), "Is admin" checkbox; validates name required, password required on new user
- [x] 7.8 Frontend: build `DeleteUserConfirmModal` — user name display, text input for exact-name confirmation, "Permanently delete" button (disabled until input matches exactly), inline error text for guardrail violations
- [x] 7.9 Frontend: build `AdminEditConfirmModal` — "Are you sure? You're about to view and edit {name}'s list as admin…" Yes/Cancel dialog
- [x] 7.10 Frontend: wire admin list screen into navigation (Home → Admin → Admin-edit list with amber banner); wire all user CRUD actions to backend

## 8. Link Preview

- [x] 8.1 Backend: implement `LinkPreviewService` — fetches URL with Jsoup (3s timeout, `User-Agent: Giftpile/1.0`), parses `og:image` then `twitter:image`, validates scheme is http/https and host is not RFC 1918 / loopback before fetching, returns image URL string or null; wraps in LRU cache (100 entries, 1h TTL using LinkedHashMap or Caffeine)
- [x] 8.2 Backend: implement `GET /api/link-preview?url=…` controller — URL-decodes parameter, calls `LinkPreviewService`, returns `{ imageUrl: "..." | null }`; returns 400 for invalid scheme; requires authentication
- [x] 8.3 Frontend: in `GiftCard`, when `gift.link` is present, fetch `/api/link-preview?url=…` on mount and render a 140px-tall `<img>` with `object-fit: cover` if `imageUrl` is non-null; no image area when null or loading

## 9. Docker Compose & Setup

- [x] 9.1 Create `docker-compose.yml` at the repo root with two profiles: `sqlite` (default) runs only the backend service with a named volume for `giftpile.db`; `postgres` profile adds a `postgres:16` service and sets `DATABASE_URL` on the backend
- [x] 9.2 Create `backend/Dockerfile` — multi-stage: Maven build stage (`maven:3.9-eclipse-temurin-25-alpine`) produces a fat jar; runtime stage (`eclipse-temurin:25-jre-alpine`) runs it with `--enable-preview`; exposes port 8080
- [x] 9.3 Create `frontend/Dockerfile` — multi-stage: `node:22-alpine` build stage runs `npm ci && npm run build`; output is copied to the backend's `src/main/resources/static/` in a combined build, OR served via nginx in a separate service (prefer the combined-jar approach for simplicity)
- [x] 9.4 Add a `docker-compose.override.yml` for local development: mounts `backend/` source for live reload (Spring Boot DevTools 4.x), and runs the Vite dev server (`npm run dev`) as a separate `node:22-alpine` service on port 5173 with `VITE_API_URL=http://localhost:8080`
- [x] 9.5 Verify `docker compose up` (SQLite profile) starts successfully, seeds no data, and the login screen is reachable at `http://localhost:8080`

## 10. README — Setup Guide

- [x] 10.1 Rewrite `README.md` with: project description, prerequisites (JDK 25, Node 22 LTS, Maven 3.9+, Docker 27+), three run modes — (a) Docker Compose one-liner, (b) local dev (separate backend + frontend commands), (c) fat-jar standalone — and the `DATABASE_URL` env var reference for Postgres opt-in
- [x] 10.2 Add a "First run" section explaining that the first admin user must be created via `POST /api/admin/bootstrap` (or document the seed SQL), since the pre-login screen is empty with no users

## 11. Backend Tests

- [x] 11.1 Add test dependencies to `pom.xml`: `spring-boot-starter-test` (includes JUnit 5.x, Mockito 5.x, AssertJ 3.x — all managed by Spring Boot BOM), import `org.testcontainers:testcontainers-bom:1.21.0` as `pom` scope; add `testcontainers-junit-jupiter` and `testcontainers-postgresql` with `test` scope
- [x] 11.2 Write unit tests for `GiftVisibilityService` covering all reveal-rule cases: blind context strips claim data, non-repeatable claimed-by-other gift is absent, repeatable gift shows only viewer's own claim, `effectiveReceived` true when today > giftDate (mock `LocalDate.now()`), `effectiveReceived` false when today == giftDate, auto-received gift appears in received section without claim attribution
- [x] 11.3 Write unit tests for the admin guardrail logic (cannot self-delete, cannot delete last admin) in `AdminService` or equivalent
- [x] 11.4 Write unit tests for `LinkPreviewService`: URL scheme validation rejects non-http(s), private IP blocked, valid URL returns parsed `og:image`, fallback to `twitter:image`, null on fetch failure
- [x] 11.5 Create `@SpringBootTest` integration test base class using Testcontainers `PostgreSQLContainer` (annotated `@Testcontainers`); configure Flyway to run migrations against the container
- [x] 11.6 Write integration tests for auth endpoints: `GET /api/users` returns user list unauthenticated, `POST /api/auth/login` with correct credentials returns 200 + session cookie, wrong credentials returns 401, `GET /api/me` with valid session returns current user, without session returns 401
- [x] 11.7 Write integration tests for gift CRUD: create gift, retrieve in owner's list (blind context — no claim fields), update gift, delete gift cascades claim, priority up/down swaps correctly
- [x] 11.8 Write integration tests for claiming: claim non-repeatable gift, second claim by another user returns 409, claim disappears from other viewer's list, un-claim restores gift to all viewers, repeatable gift accepts two simultaneous claims, `effectiveReceived` computed correctly when date is in the past
- [x] 11.9 Write integration tests for admin: add user (color assigned), edit user name without resetting password, delete user cascades gifts and claims, self-delete returns 400, last-admin delete returns 400
- [x] 11.10 Add a SQLite-backed `@SpringBootTest` slice (using `application-test.properties` with `jdbc:sqlite::memory:`) as a lightweight alternative for CI where no Docker is available; run both suites in Maven (`-Pintegration` profile for Testcontainers, default for SQLite)

## 12. Frontend Tests

- [x] 12.1 Install test dev dependencies in `frontend/`: `vitest@3`, `@vitest/ui@3`, `jsdom`, `@testing-library/react@16`, `@testing-library/user-event@14`, `@testing-library/jest-dom@6`; configure `vitest.config.js` with jsdom environment and `@testing-library/jest-dom/vitest` setup file
- [x] 12.2 Install `@playwright/test@1.52` as a dev dependency; run `npx playwright install chromium`; create `playwright.config.js` pointing at `http://localhost:8080` with a `webServer` entry that starts the backend before tests run
- [x] 12.3 Write Vitest unit tests for the `computeGiftVisibility` shared utility (if any client-side filtering is done): mirrors the backend reveal-rule scenarios for `effectiveReceived`, tag chip rendering conditions, and disabled state of up/down buttons at list boundaries
- [x] 12.4 Write React Testing Library component tests for `GiftFormModal`: renders with empty fields for new gift, "Only give this once" is checked by default, submitting without title shows validation error, submitting valid form calls `onSave` with correct payload, edit mode pre-fills fields
- [x] 12.5 Write React Testing Library component tests for `ClaimModal`: new-claim mode has no un-claim button, edit-claim mode shows un-claim button pre-filled with date, confirming calls `onClaim` with selected date
- [x] 12.6 Write React Testing Library component tests for `DeleteUserConfirmModal`: "Permanently delete" button disabled initially, enabled only when input matches name exactly, submitting calls `onConfirm`
- [x] 12.7 Write React Testing Library component tests for `GiftCard`: renders price chip only when price present, renders cover image only when imageUrl non-null, up button disabled for first item, down button disabled for last item, tag chips rendered correctly for each flag combination
- [x] 12.8 Write Playwright E2E test: full login flow — select user → enter password → arrive at Home screen → see "My gift list" card
- [x] 12.9 Write Playwright E2E test: add gift → gift appears in My List → edit gift → changes reflected → delete gift with confirmation → gift gone
- [x] 12.10 Write Playwright E2E test: claim flow — user A logs in, adds a gift; user B logs in, opens user A's list, claims the gift with a past date; gift disappears from other viewer's list; gift appears as received after reload (effectiveReceived)
- [x] 12.11 Write Playwright E2E test: admin flow — admin logs in, opens Admin panel, adds a new family member, edits them, then deletes with type-to-confirm; user no longer appears on pre-login screen

## 13. Navigation & UI Polish

- [x] 13.1 Frontend: implement client-side routing (React Router or similar): routes for `/` (user-select), `/login/:userId` (password), `/home`, `/list/me`, `/list/:userId`, `/admin`, `/admin/list/:userId`
- [x] 13.2 Frontend: build sticky top bar component — back chevron (hidden on Home), screen title, logout icon (Home only); back target logic: admin-list-editor → Admin, other screens → Home
- [x] 13.3 Frontend: implement screen entry animation — fade + slide-up (~350ms, `cubic-bezier(0.2, 0, 0, 1)`) on route change using CSS transitions or `@keyframes`
- [x] 13.4 Frontend: implement bottom-sheet modal animation — backdrop fade (~200ms), sheet scale+translate pop-in (~250ms, `cubic-bezier(0.2, 0, 0, 1)`); click outside backdrop closes modal
- [x] 13.5 Frontend: load Manrope 800 from Google Fonts (or self-host) and apply to all heading elements; verify system font stack on body text
- [x] 13.6 Frontend: verify mobile-first layout on 375px viewport for all 6 screens and 5 modals; fix any overflow or touch-target sizing issues (min 44px tap targets)
