## 1. Decide

- [ ] 1.1 Árpád: count = viewer-visible gifts (recommended) or raw active gifts?

## 2. Implement

- [ ] 2.1 Backend endpoint returning per-member counts for the current viewer (reuse
      `GiftVisibilityService.filterForViewer` — do not duplicate the rules).
- [ ] 2.2 Backend test: claimed-by-other gift lowers the count for third parties but not for the
      claimer; own list count unaffected.
- [ ] 2.3 `Home.jsx`: fetch counts alongside the user list; render "{n} ideas" / "1 idea" in
      `UserRow`'s meta slot.
- [ ] 2.4 Design check against `03-home.png` (12.5px muted meta line under the name).
