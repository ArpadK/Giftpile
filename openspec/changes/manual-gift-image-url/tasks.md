## 1. Decide

- [ ] 1.1 Árpád: manual image URL field (recommended) or full upload support?

## 2. Implement (URL-field variant)

- [ ] 2.1 Add nullable `image_url` to `Gift` (+ migration or ddl-auto per the Flyway decision).
- [ ] 2.2 Expose in `GiftDTO` and accept in `GiftController.GiftRequest` (owner/admin only, same
      as other fields).
- [ ] 2.3 `GiftFormModal`: "Image URL (optional)" input under Link.
- [ ] 2.4 `GiftCard`: use gift.imageUrl when present; skip the link-preview fetch in that case.
- [ ] 2.5 Tests: DTO round-trip; card precedence (manual beats scraped beats placeholder).
