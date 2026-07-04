## Why

The link-preview scraper works for shops that expose Open Graph / JSON-LD images to plain HTTP
clients (bol.com, coolblue.nl), but amazon.nl and tweakers.net serve bot walls / consent pages,
so those gifts fall back to the abstract placeholder cover. Scraping harder (headless browser,
UA games) fights an arms race and violates KISS.

**Decision needed from Árpád:** the simple robust fix is a user-provided image. Options:
1. **Optional "Image URL" field** on the gift form — paste any image address; it takes precedence
   over the scraped preview. Minimal (one nullable column, one input).
2. **Image upload** — nicer UX, but adds file storage, size limits, and serving concerns to a
   self-hosted app.

Option 1 recommended (KISS); upload can come later if pasting URLs annoys people.

## What Changes

- `Gift` entity + DTO: nullable `imageUrl` column.
- Gift form bottom sheet: optional "Image URL (optional)" input.
- `GiftCard`: precedence becomes gift.imageUrl → scraped preview → placeholder cover.
- Link-preview endpoint stays as-is (still fills the gap for shops that do work).

## Capabilities

### Modified Capabilities
- `gift-management`: gifts can carry an explicit image URL.
- `gift-card-display`: cover image resolution order defined (manual → scraped → placeholder).

## Impact

- Schema change (fits whichever outcome `enable-flyway-migrations` decides).
- `Gift`, `GiftDTO`, `GiftController.GiftRequest`, `GiftFormModal`, `GiftCard` + tests.
