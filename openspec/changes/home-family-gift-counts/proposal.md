## Why

The design's Home screen shows "{n} ideas" under every family member (see
`design_handoff_gift_list_app/screenshots/03-home.png`). The app currently shows the count only
on the "My gift list" card; family rows show just the name. This is the last visible design
element that is not implemented.

**Decision needed from Árpád:** what should the count mean for *someone else's* list?
1. **Viewer-visible count** (gifts you can actually see — hidden claimed/received gifts excluded).
   Matches what you find when you tap through; costs a per-viewer computation.
2. **Raw active count** (owner's non-received gifts). Cheaper, but the number "8 ideas" can shrink
   to "5" after tapping in, and a changing count leaks that *something* was claimed.

Option 1 is the privacy-consistent choice and recommended.

## What Changes

- Backend: extend `GET /api/users` (authenticated variant) or add a
  `GET /api/users/counts` endpoint returning `{ userId: visibleActiveCount }` computed with
  `GiftVisibilityService` for the current viewer. Keep it one query-ish (family-scale, N is tiny).
- Frontend: `Home.jsx` passes the count into `UserRow` (`"{n} ideas"`, singular "1 idea") —
  `UserRow` already supports a meta line.

## Capabilities

### Modified Capabilities
- `home-screen`: family rows show per-member idea counts consistent with the reveal rules.

## Impact

- `UserController` (or new endpoint), `Home.jsx`, `UserRow.jsx`; one new backend test for the
  count semantics.
