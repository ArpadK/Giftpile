## Why

Young children can't log in or curate their own wishlist, yet the family still wants to keep
gift ideas for them and coordinate who gives what. Today every list either belongs to a
logged-in user or is edited blindly by an admin — there is no way for a parent to maintain a
child's list *and* see what has already been claimed so the family avoids buying the same thing
twice.

## What Changes

- Introduce **kid users**: user accounts that represent a child, created and managed by an admin.
  A kid may optionally be allowed to log in (admin toggle); if login is disabled the kid never
  appears on the login screen.
- Each kid can have **one or more parent (manager) users** assigned by the admin. Parents curate
  the kid's list on the kid's behalf.
- A parent sees their kid's list in **two ways**, sharing the same underlying data (every gift +
  full claim info), differing only in the controls offered:
  - **Regular view** (tap the kid in Family): normal claim/unclaim controls, but claimed gifts are
    *not* hidden — every gift shows, with who claimed it and the gift date, so parents can claim
    directly without entering edit mode.
  - **Edit view** (a "Manage list" button inside the regular view, managers only): full CRUD
    (add/edit/delete/reorder/mark-received) like the parent's own list, plus the same claim
    visibility.
- **BREAKING (invariant carve-out)**: the long-standing rule "the owner of a list never sees claim
  data" gains a documented exception — a kid's *managers* see all claim data on that kid's list.
  The kid themselves (if they log in) still views their own list blind, and admins who are not
  managers still edit blind.
- Non-parent family members see a kid's list exactly like any other member's list (normal reveal
  rules, claims stay secret).
- A kid can be **upgraded to a full user** later: the admin clears the kid flag (which removes all
  parent access) and ensures login + password; the kid's existing gifts and claims are retained.

## Capabilities

### New Capabilities
- `kid-user`: the kid account concept, the parent/manager relationship and its constraints, the
  two parent-facing views (regular + edit) and their entry points/controls, and the upgrade path.

### Modified Capabilities
- `gift-claiming`: the gift-visibility pure function gains a **guardian context** — for a viewer
  who manages the list's kid owner, all gifts are returned including full claim data; the
  "owner/admin permanently blind" requirement is amended to carve out managers.
- `admin`: the add/edit-user flow gains a kid type, a "can log in" toggle, parent (manager)
  assignment, and the upgrade-to-full-user action, with validation that kids cannot manage other
  kids.
- `user-auth`: the pre-login user picker excludes kids who cannot log in; a login-enabled kid
  authenticates and behaves exactly like any other user.

## Impact

- **Backend**: `User` entity (`isKid`, `canLogin`), new `kid_managers` join table + Flyway
  migration (SQLite + Postgres), `GiftVisibilityService` context enum (blind / reveal / guardian),
  `UserController.getGifts` + `AdminController` context resolution, `GiftDTO` gains a claim summary
  for the guardian context, `PublicUserDTO`/login picker filtering, `AdminController` user CRUD +
  manager endpoints, `CustomUserDetailsService` (block login for no-login kids).
- **Frontend**: `Home`/`GiftList` regular-vs-guardian rendering + "Manage list" entry, claim
  badges showing claimer identity, `AdminPanel`/`UserFormModal` kid type + login toggle + parent
  multiselect + upgrade action, `src/lib/api.js` additions.
- **Docs**: update the core invariant statement in `CLAUDE.md` to note the guardian carve-out.
