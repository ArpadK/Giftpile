## 1. Data model & migration

- [x] 1.1 Add `isKid` (default false) and `canLogin` (default true) boolean fields to the `User` entity with getters/setters
- [x] 1.2 Create a `kid_managers(kid_user_id, manager_user_id)` join table mapping (composite PK, FKs to `users`)
- [x] 1.3 Write a Flyway migration adding `is_kid` + `can_login` columns and the `kid_managers` table, portable across SQLite and Postgres
- [x] 1.4 Add repository queries: manager ids by kid id, and an existence check `existsByKidIdAndManagerId`

## 2. Visibility context

- [x] 2.1 Introduce a `ViewContext` enum (`BLIND`, `REVEAL`, `GUARDIAN`) and replace the `isBlindContext` boolean in `GiftVisibilityService`
- [x] 2.2 Implement guardian filtering: return all gifts (nothing hidden) and expose all claims
- [x] 2.3 Add context resolution in `UserController.getGifts` (guardian when owner is a kid the viewer manages; else blind/reveal), keeping resolution in one place
- [x] 2.4 Keep `AdminController.getUserGifts` blind for non-managers; guardian only via the manager relationship

## 3. DTOs & endpoints

- [x] 3.1 Extend `GiftDTO` with an optional `claims` summary (claimer name, color, gift date) populated only in guardian context
- [x] 3.2 Add a `canManage` capability flag to the gift-list response (or a sibling endpoint field) so the frontend can offer the Manage entry and edit controls
- [x] 3.3 Filter no-login kids out of the pre-login picker (`PublicUserDTO` listing / `GET /api/users`)
- [x] 3.4 Block session establishment for `!canLogin` users in `CustomUserDetailsService`

## 4. Admin management

- [x] 4.1 Extend admin create/update user to accept `isKid`, `canLogin`, and a parents list; enforce `isKid`/`isAdmin` mutual exclusivity and password-required-only-when-can-login
- [x] 4.2 Enforce manager assignment invariants: managed side must be a kid, manager side must not be a kid
- [x] 4.3 Add endpoint(s) to view and change a kid's parents, taking effect immediately
- [x] 4.4 Implement upgrade-to-full-user as edits: clear `isKid`, remove `kid_managers` rows, ensure `canLogin` + password, in one transaction; preserve gifts and claims

## 5. Frontend

- [x] 5.1 `UserFormModal`/`AdminPanel`: add Kid toggle, Can-log-in toggle, Parents multiselect (non-kids only), and mutual-exclusion with Is Admin
- [x] 5.2 `AdminPanel`: expose manage-parents and upgrade-to-full-user actions (via the edit form: parents multiselect; unchecking Kid upgrades)
- [x] 5.3 `GiftList` regular view: when `canManage`, render claim badges with claimer identity + date, do not hide claimed gifts, and show a "Manage list" button
- [x] 5.4 `GiftList` edit view: reuse the admin-edit mode/banner to offer full CRUD over the guardian data for managers (new `/manage/list/:id` route)
- [x] 5.5 Add the needed `src/lib/api.js` calls (parents management, upgrade) — generic client already covers the new endpoints

## 6. Tests & docs

- [x] 6.1 Backend: unit-test context resolution for owner / non-manager admin / other viewer / guardian, and the guardian claim attribution
- [x] 6.2 Backend: test manager invariants (kid can't manage kid, isKid/isAdmin exclusivity) and no-login kid cannot authenticate
- [x] 6.3 Backend: test upgrade preserves gifts/claims and revokes parent access
- [x] 6.4 Frontend: test regular-view claim badges + claim-button suppression for one-time gifts already taken
- [x] 6.5 Update the core invariant statement in `CLAUDE.md` to document the guardian carve-out
