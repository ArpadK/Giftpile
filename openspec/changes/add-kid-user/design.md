## Context

Giftpile's gift-visibility logic today collapses every viewer situation into a single boolean,
`isBlindContext`, resolved in two controllers (`UserController.getGifts`, `AdminController.getUserGifts`)
and consumed in one service (`GiftVisibilityService`). Two situations map to blind (owner viewing
own list; admin editing another's list) and everything else falls through to the reveal rules. The
core product invariant — "the owner of a list, and an admin editing it, never sees claim data" — is
enforced entirely there.

Kid users need a viewer situation that no existing branch covers: a parent who sees the *whole*
list *and* full claim data, so the family can coordinate gifts for a child who cannot manage their
own list. This is the first and only place the owner-blind invariant is deliberately relaxed.

Constraints: KISS (no speculative abstraction), Flyway migration must run on both SQLite and
Postgres, gift-visibility rules must stay in one place, session auth via Spring Security, DTOs are
Java records.

## Goals / Non-Goals

**Goals:**
- Model a kid account, an optional login capability, and a many-to-many parent/manager relationship.
- Add a single new visibility context ("guardian") to the existing pure function.
- Give parents two entry points (regular claim view + edit view) over the same guardian data.
- Preserve the owner-blind invariant everywhere except for a kid's own guardians.
- Support upgrading a kid to a full user as ordinary field edits, not a bespoke flow.

**Non-Goals:**
- Letting parents assign or manage other parents (admin-only).
- A "last parent" guardrail (an admin can always edit; orphaned kid lists are acceptable).
- Any change to how non-parents see a kid's list (unchanged reveal rules).
- Per-parent-scoped surprises between two parents (all guardians see all claims by design).

## Decisions

### 1. Represent kid + login with explicit booleans on `User`
Add `isKid` and `canLogin` boolean columns, mirroring the existing flat `isAdmin` style.
- **Why not derive kid = "has ≥ 1 manager"?** A freshly created kid with no parents yet would be
  indistinguishable from a normal user, and the upgrade path would become implicit magic. Explicit
  is more boring and matches the codebase.
- **Why a `canLogin` column rather than reusing a nullable `passwordHash`?** `passwordHash` is
  currently `NOT NULL`; overloading "no password" with "no login" is less clear than a dedicated
  flag. `canLogin` gates both the pre-login picker and session establishment. A password is
  required only when `canLogin` is true.
- Invariant: `isKid` and `isAdmin` are mutually exclusive; enforced in `AdminController`.

### 2. Many-to-many `kid_managers` join table
`kid_managers(kid_user_id, manager_user_id)`, both FKs to `users`, composite PK. A kid has many
parents; a parent may have many kids (siblings). Two assignment-time invariants: the managed side
must be `isKid = true`, the manager side must be `isKid = false` ("kids can't manage another kid").
Prefer a plain join table + repository query (`findManagerIdsByKidId`, `existsByKidIdAndManagerId`)
over a JPA `@ManyToMany` collection to keep fetch behavior explicit and boring.

### 3. Replace `isBlindContext` boolean with a three-value context
`GiftVisibilityService` takes a `ViewContext` enum: `BLIND`, `REVEAL`, `GUARDIAN`. Context is
resolved in the controllers, keeping the rules in one place:

```
resolve(viewerId, ownerId):
  if owner isKid AND viewer manages owner   -> GUARDIAN
  elif viewerId == ownerId                  -> BLIND
  elif viewer isAdmin                        -> BLIND
  else                                       -> REVEAL
```

GUARDIAN check precedes BLIND/admin so an admin who is also a parent gets guardian visibility. An
admin who is *not* a parent keeps today's blind admin-edit. `BLIND` and `GUARDIAN` both show all
gifts; they differ only in whether claim data is attached — GUARDIAN attaches all claims, BLIND
attaches none, REVEAL attaches the viewer's own claim and hides claimed-by-others.

### 4. One guardian dataset, two frontend control sets
The regular view and the edit view request the same guardian data (all gifts + all claims). They
differ only in which controls the frontend renders: the regular view shows claim/unclaim; the edit
view (reached via a managers-only "Manage list" button, mirroring the existing admin-edit banner
pattern) shows full CRUD. The backend does not need two datasets — it returns guardian data plus a
capability flag (e.g. `canManage`) so the frontend knows to offer the Manage entry and edit
controls. This reuses the admin-edit mode/banner pattern rather than inventing a new one.

### 5. `GiftDTO` gains a claim summary for guardian responses
Today `GiftDTO.claim` is the viewer's own single claim. Guardian responses need every claim with
claimer identity (name + color) and date, including multiple claims on repeatable gifts. Add an
optional `claims` list (claimer name, color, gift date) populated only in guardian context; the
existing singular `claim` field stays for reveal context. This is the one DTO shape that grows, and
the only place other users' claim attribution is ever serialized.

### 6. Upgrade = ordinary edits, no special endpoint
"Upgrade to full user" is: set `isKid = false`, clear `kid_managers` rows for that kid, ensure
`canLogin = true` with a password (prompt if absent). Gifts and claims are owned by the kid's user
row and are untouched. The AdminPanel exposes this as an explicit action for clarity, but it maps
onto the same `PUT /api/admin/users/{id}` update semantics.

### 7. Login gating
`PublicUserDTO` listing (`GET /api/users` used by the pre-login picker) filters out
`isKid && !canLogin`. `CustomUserDetailsService` refuses to load / authenticate a user with
`!canLogin`, so a no-login kid can never establish a session even if probed directly.

## Risks / Trade-offs

- **Invariant relaxation could leak claim data to the wrong viewer** → context resolution lives in
  one place and is unit-tested per branch (owner/admin/other/guardian); guardian requires an
  explicit `kid_managers` membership check, defaulting to REVEAL when absent.
- **Two parents can't keep gift secrets from each other about the kid** → accepted and intended
  (the whole point is coordination); documented as a non-goal.
- **A login-enabled (older) kid could be spoiled if a parent talks** → the *system* keeps the kid's
  own view blind; parent discretion is a social matter, out of scope.
- **Flyway divergence between SQLite and Postgres** → use portable column types (boolean, integer
  FKs) in a single `V__` migration, matching the existing `V1__init.sql` approach; verify on both.
- **`isKid`/`isAdmin`/`kid_managers` drift out of sync** → enforce mutual exclusivity and
  manager-side non-kid at the controller, and clear manager rows on upgrade in one transaction.

## Migration Plan

1. Flyway migration: add `is_kid` (default false) and `can_login` (default true) to `users`; create
   `kid_managers`. Defaults make existing users normal, login-capable, non-kids — no data change.
2. Ship backend (entity, context enum, DTO, controllers, login gating) behind the same session
   auth; no API removed, only additive fields/endpoints.
3. Ship frontend (admin kid form, guardian rendering, Manage entry).
4. Update the invariant statement in `CLAUDE.md` to note the guardian carve-out.
- **Rollback**: the feature is additive; unused, the new columns default to normal-user behavior.
  Reverting the app code leaves the extra columns/table inert.

## Open Questions

- None blocking. Confirmed during exploration: unified guardian data with two control sets; show
  who claimed (not just "taken"); Manage-button entry point; admin-only management; upgrade as
  ordinary edits.
