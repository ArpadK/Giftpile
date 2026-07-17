## 1. Data model & migration

- [ ] 1.1 Add `isKid` (default false) and `canLogin` (default true) boolean fields to the `User` entity with getters/setters
- [ ] 1.2 Create a `kid_managers(kid_user_id, manager_user_id)` join table mapping (composite PK, FKs to `users`)
- [ ] 1.3 Write a Flyway migration adding `is_kid` + `can_login` columns and the `kid_managers` table, portable across SQLite and Postgres
- [ ] 1.4 Add repository queries: manager ids by kid id, and an existence check `existsByKidIdAndManagerId`

## 2. Visibility context

- [ ] 2.1 Introduce a `ViewContext` enum (`BLIND`, `REVEAL`, `GUARDIAN`) and replace the `isBlindContext` boolean in `GiftVisibilityService`
- [ ] 2.2 Implement guardian filtering: return all gifts (nothing hidden) and expose all claims
- [ ] 2.3 Add context resolution in `UserController.getGifts` (guardian when owner is a kid the viewer manages; else blind/reveal), keeping resolution in one place
- [ ] 2.4 Keep `AdminController.getUserGifts` blind for non-managers; guardian only via the manager relationship

## 3. DTOs & endpoints

- [ ] 3.1 Extend `GiftDTO` with an optional `claims` summary (claimer name, color, gift date) populated only in guardian context
- [ ] 3.2 Add a `canManage` capability flag to the gift-list response (or a sibling endpoint field) so the frontend can offer the Manage entry and edit controls
- [ ] 3.3 Filter no-login kids out of the pre-login picker (`PublicUserDTO` listing / `GET /api/users`)
- [ ] 3.4 Block session establishment for `!canLogin` users in `CustomUserDetailsService`

## 4. Admin management

- [ ] 4.1 Extend admin create/update user to accept `isKid`, `canLogin`, and a parents list; enforce `isKid`/`isAdmin` mutual exclusivity and password-required-only-when-can-login
- [ ] 4.2 Enforce manager assignment invariants: managed side must be a kid, manager side must not be a kid
- [ ] 4.3 Add endpoint(s) to view and change a kid's parents, taking effect immediately
- [ ] 4.4 Implement upgrade-to-full-user as edits: clear `isKid`, remove `kid_managers` rows, ensure `canLogin` + password, in one transaction; preserve gifts and claims

## 5. Frontend

- [ ] 5.1 `UserFormModal`/`AdminPanel`: add Kid toggle, Can-log-in toggle, Parents multiselect (non-kids only), and mutual-exclusion with Is Admin
- [ ] 5.2 `AdminPanel`: expose manage-parents and upgrade-to-full-user actions
- [ ] 5.3 `GiftList` regular view: when `canManage`, render claim badges with claimer identity + date, do not hide claimed gifts, and show a "Manage list" button
- [ ] 5.4 `GiftList` edit view: reuse the admin-edit mode/banner to offer full CRUD over the guardian data for managers
- [ ] 5.5 Add the needed `src/lib/api.js` calls (parents management, upgrade)

## 6. Tests & docs

- [ ] 6.1 Backend: unit-test context resolution for owner / non-manager admin / other viewer / guardian, and the guardian claim attribution
- [ ] 6.2 Backend: test manager invariants (kid can't manage kid, isKid/isAdmin exclusivity) and no-login kid cannot authenticate
- [ ] 6.3 Backend: test upgrade preserves gifts/claims and revokes parent access
- [ ] 6.4 Frontend: test regular-view claim badges + Manage entry visibility for managers vs non-managers
- [ ] 6.5 Update the core invariant statement in `CLAUDE.md` to document the guardian carve-out
