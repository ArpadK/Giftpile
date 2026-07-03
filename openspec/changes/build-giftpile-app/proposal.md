## Why

Giftpile does not yet exist as working software — the repository is empty scaffolding. A complete design handoff (screens, interactions, data model, design tokens, and a working prototype) is available. This change builds the full application from scratch.

## What Changes

- New Maven-based Java 25 / Spring Boot backend with REST API, Spring Security session auth, JPA entities, and Flyway migrations.
- New Vite + React frontend implementing all 6 screens and 5 modals from the design handoff at pixel-level fidelity using the specified design tokens.
- SQLite embedded database as the default (zero-config self-hosting); Postgres supported by setting a `DATABASE_URL` env var.
- Backend proxy endpoint for OpenGraph link-preview images (avoids browser cross-origin restrictions).
- Shared gift-visibility pure function implementing the "reveal rule" (claim hiding, auto-receive, repeatable gifts) used consistently across all list views.

## Capabilities

### New Capabilities

- `user-auth`: Family-member user-selection UI (no typed username), password entry, server-side session (Spring Security + bcrypt). Login flow state machine: pick user → enter password → session.
- `gift-management`: Full CRUD for gift ideas per user (title, link, price, description, exactColor, exactProduct, onlyOnce flags, manual-received toggle, priority). Gift editor screen and add/edit bottom-sheet modal. Up/down priority reordering within the active list.
- `gift-claiming`: Browse another member's wishlist; claim a gift with a gift date; the reveal rule hides claimed gifts from other viewers, auto-flips to received the day after the gift date (for non-repeatable gifts), and keeps the owner permanently blind to claim data. Repeatable gifts support concurrent independent claims.
- `admin`: Admin panel for user CRUD (add/edit/delete family members with type-to-confirm delete guardrails). Admin-edit-list flow with medium-friction confirmation dialog before entering blind-edit mode on another user's list.
- `link-preview`: Backend proxy (`/api/link-preview?url=…`) that fetches OpenGraph metadata and returns a preview image URL; used by gift cards to display cover images when a link is present.

### Modified Capabilities

_(none — greenfield project)_

## Impact

- Introduces the entire project codebase: `backend/` (Maven, Spring Boot) and `frontend/` (npm, Vite, React).
- Runtime dependencies: JDK 25, Node 20+, Maven 3.9+. SQLite via `xerial/sqlite-jdbc`; Postgres via standard `postgresql` JDBC driver.
- No existing code is modified or broken.
