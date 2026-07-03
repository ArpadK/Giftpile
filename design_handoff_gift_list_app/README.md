# Handoff: Giftly — Family Gift Idea Database

## Overview
Giftly is a mobile-first, local/family-only web app for tracking gift ideas. Each family member maintains their own wishlist (title, link, price, description, exact-match flags, repeatable flag). Other family members browse each other's lists and "claim" a gift to give, picking a gift date — the claim stays hidden from the recipient (and from other givers) until the day after the gift date, at which point non-repeatable gifts flip to "received" everywhere. An admin role can manage user accounts and, after a confirmation step, edit anyone's list contents (without seeing claim/gifting info).

## About the Design Files
The file in this bundle (`Giftly.dc.html`) is a **design reference** — an interactive HTML/React prototype built to show intended look, flow, and behavior. It is not production code to copy as-is. The task is to **recreate this design in your target codebase's environment** (e.g. a real React/Vue/mobile app with a real backend and auth) using that codebase's existing patterns, component library, and data layer — or, if no environment exists yet, to pick the most suitable stack and implement fresh.

Note: the prototype uses browser `localStorage` for persistence and plaintext passwords purely to simulate the experience client-side. **Do not carry this over** — implement real authentication (hashed passwords, sessions) and server-side persistence in production.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and component states below should be treated as final and recreated precisely. Copy/microcopy shown is final unless your brand voice dictates otherwise.

## Screens / Views

### 1. User select (pre-login)
- **Purpose**: Pick which family member is signing in (no typing a username).
- **Layout**: Centered column, 24px side padding, top padding ~48px. Logo lockup (44×44 rounded-square icon + "Giftly" wordmark) at top, "Who's this?" subhead, then a vertical list of tappable rows, 10px gap.
- **Row component**: white card, 20px radius, soft shadow, 14×16px padding, flex row: 44px circular avatar (initial letter, bold, white on the user's accent color) + name (700 weight, 15.5px) + trailing chevron-right icon (18px, muted).

### 2. Password step
- **Purpose**: Enter password for the selected person.
- **Layout**: Centered column. "Not {name}?" back link (with left-chevron) above an avatar + "Hi, {name}" heading (800 weight, 22px). Password input, error text (if any), full-width primary "Sign in" button, small muted hint text below.

### 3. Home
- **Purpose**: Hub after login — go to your own list, browse family members, reach admin.
- **Layout**: Sticky top bar (see Top Bar below) showing "Hi, {name}". Below: a large primary-colored "My gift list" card (rounded 20px, white icon badge, title, active-count subtext, chevron), then a "Family" section label (uppercase, 13px, muted, letter-spacing) followed by one row per other family member (avatar, name, "{n} ideas" subtext, chevron) — same row style as user-select. If the signed-in user is an admin, an additional "Manage" section with one dashed-border "Admin" row (amber icon badge, shield icon).

### 4. My list / Admin-edit list ("blind" list editor)
- **Purpose**: Add/edit/reorder/remove your own gift ideas. Also used by admins editing someone else's list (identical UI, plus an amber info banner: "Admin mode — you're editing someone else's list. You can't see who will receive which gift.").
- **Layout**: Full-width "+ Add a gift idea" pill button (primary-tint background, primary text) at top. Then a vertical stack of gift cards (12px gap). Below active gifts, a "Show/Hide received gifts" toggle reveals a dimmed (60% opacity) list of received items with an "Undo" pill and delete button.
- **Gift card** (active): white, 20px radius, shadow, overflow hidden. Optional 140px-tall cover image (object-fit cover) on top when a link is present. Body padding 14×16px: title (700, 16px) + price chip (amber-tinted pill, top-right, 800 weight 13px, e.g. "€89") on one row; optional description (13.5px, muted, 1.5 line-height); optional "View item ↗" link (13px, primary, underlined) when a link exists; a wrapping row of tag chips (11.5px, 700 weight, colored pill backgrounds — see Tag Chips below); an action row of five 36px circular icon buttons: move-up, move-down (both bordered, disabled/faded at list boundaries), spacer, edit (primary-tint bg), mark-received (green-tint bg, check icon), delete (red-tint bg, trash icon).
- Reordering only changes the priority of the person's own **active** gifts; it's manual (up/down), not drag-and-drop, but drag-and-drop is an acceptable production upgrade.

### 5. Other member's list (claim / "give" view)
- **Purpose**: Browse someone else's wishlist and claim a gift to give.
- **Layout**: Same card visuals as the editor list, minus edit controls. Gifts the viewer has already claimed show struck-through title, slightly reduced card opacity (0.85), and a green info bar ("You're giving this · {date}" + "Edit" pill). Unclaimed, available gifts show a full-width primary "I'll get this one" button. A gift someone else has already claimed (and it's not a repeatable gift) is **entirely absent from this list** — not shown, not grayed out. A "Show received gifts" toggle reveals items that have flipped to received (title struck through, "Received" label; if the viewer was the one who gave it, an "edit" pill is still available so they can correct the date or un-claim even after the fact).

### 6. Admin
- **Purpose**: Manage family member accounts.
- **Layout**: Full-width "+ Add family member" pill button, then a card per user: avatar, name, "Admin" label (amber, 700, 11.5px) if applicable, an edit-pencil icon button, and a delete (trash) icon button — plus a full-width bordered "View / edit their list" button beneath each card.

## Interactions & Behavior

### Claiming a gift (bottom-sheet modal)
Tapping "I'll get this one" (or "Edit" on an existing claim) opens a bottom sheet: title ("Give '{gift title}'"), helper copy ("Pick the day you plan to give this. It'll stay a secret until the day after."), a native date input, primary "Confirm — I'll give this" / "Update date" button, and — only when editing an existing claim you made — a red "I didn't give this after all" button that clears the claim entirely (the giver can always change their mind, even after the gift date has passed).

### The reveal rule (core game mechanic)
- A gift can have at most one `claim = { by: userId, date }` at a time for non-repeatable gifts. Repeatable gifts (see below) can be claimed independently by multiple different people simultaneously without anyone seeing the others' claims.
- **Recipient's own view is always blind**: the owner (and an admin editing that owner's list) never sees claim data — the gift just silently becomes "received" once resolved, exactly like a manual received-toggle. No hint of who is giving it or when.
- **Other viewers who are not the claimer**: cannot see the gift at all once someone else has claimed it (for non-repeatable gifts) — it disappears from their view of that list, so nobody double-buys. Once the gift date has passed and the gift auto-resolves to "received," it reappears to everyone (including other viewers) in the collapsed "received" section, generically marked "Received" — still without revealing who gave it.
- **The claimer's own view**: always sees their claim (struck-through title, date, edit/un-claim controls) in that person's list, indefinitely — even after the reveal date passes — so they can correct a mistake (wrong date, or "I ended up getting something else").
- **Reveal timing**: "day after the gift date" = the transition to received happens once *today > gift date* (strictly after, not on the day itself).
- **Repeatable gifts** (`onlyOnce: false`, e.g. "wool socks") never auto-mark as received and never block other people's independent claims — the visibility-hiding and auto-receive rules above only apply when `onlyOnce: true`.

### Gift form (add/edit — bottom sheet modal)
Fields, in order: Title (required — the *only* required field, since something like "socks" needs no more detail), Link (optional URL), Price (optional number), Notes (optional multi-line text), then three checkboxes:
1. "Must be this exact color" — default **unchecked** (color doesn't matter unless checked).
2. "Must be this exact product / brand" — default **unchecked**.
3. "Only give this once" — default **checked**; unchecking it is what marks a gift as repeatable/multi-giftable (helper copy: "uncheck for things like socks").

### Admin: delete user (high-friction confirmation)
Deleting a user requires typing their exact name into a text field before the destructive "Permanently delete" button enables (disabled/45%-opacity otherwise). Deleting cascades: removes the user, all their gift ideas, and clears any claims *they* had made on other people's gifts. Guardrails (surface as inline error text): cannot delete the account you're currently logged in as; cannot delete the last remaining admin.

### Admin: edit someone else's list (medium-friction confirmation)
Tapping "View / edit their list" opens a simple Yes/Cancel confirmation dialog ("Are you sure? You're about to view and edit {name}'s list as admin. This could spoil a surprise if you're not careful.") before navigating into the blind list editor for that person. This is a lighter-weight confirm than user deletion — no typed confirmation, just a clear Yes/Cancel — deliberately calibrated so one accidental tap can't reveal anything.

### Gift deletion (list editor)
Lightweight confirm dialog ("Remove this gift idea? '{title}' will be removed from the list for good.") before removing.

### Navigation
Top bar is sticky, shows a back-chevron on every screen except Home (back target: list-editor → Admin if entered via admin, else Home; other-member list → Home; Admin → Home). Logout icon button lives in the Home top bar only.

### Persistence
All state (users, gifts, session) persists across reloads. In production this becomes real server-side storage + session/auth tokens instead of localStorage.

### Motion
Screen content fades/slides up on entry (~300-400ms). Modals: backdrop fades in (~200ms), sheet pops in with a slight scale+translate (~250ms). Standard easing: `cubic-bezier(0.2, 0, 0, 1)`.

## State Management (data model)
```
User {
  id, name, password (hash in prod), isAdmin: boolean, color: hex (accent for avatar)
}

Gift {
  id, ownerId,
  title: string (required),
  link: string (optional URL — used to fetch/display a preview image),
  price: number|string (optional),
  description: string (optional),
  exactColor: boolean (default false),
  exactProduct: boolean (default false),
  onlyOnce: boolean (default true)  // false = repeatable, e.g. socks
  manualReceived: boolean (default false)  // owner/admin can toggle directly
  claim: { by: userId, date: 'YYYY-MM-DD' } | null
  priority: number  // manual sort order within owner's active list
}
```
Derived (compute, don't store): `effectiveReceived(gift) = manualReceived || (claim && onlyOnce && today > claim.date)`.

List visibility is a pure function of `(gift, viewerId, ownerId, isBlindContext)` per the reveal rules above — implement it once and share it between "my list," "admin-edit list," and "other member's list" views rather than duplicating logic.

Session: current logged-in user id. Login flow state: selected user (pre-password) → password → session.

## Design Tokens

### Colors
- Primary (royal blue): `#4C5FE8` — hover/press states should follow standard Material-style state-layer treatment (darken ~8-12%).
- Primary soft (tint bg): `#E9EBFC`
- Background: `#F4F5FA`
- Surface (cards): `#FFFFFF`
- Text primary: `#1A1B25`
- Text muted: `#6B7080`
- Border: `#E4E6EF`
- Danger: `#E5484D` / danger-soft `#FDE7E8`
- Amber (price / admin accent): `#F2A93B` / soft `#FDF0DD` / text-on-soft `#B5720F`
- Violet (exact-match tags): `#8B5CF6` / soft `#EFE7FE` / text-on-soft `#6D3FCB`
- Teal (repeatable tag): `#2EC4B6` / soft `#DFF8F5` / text-on-soft `#12897D`
- Green (received / claimed-by-me): `#22C55E` / soft `#E4F8EA` / text-on-soft `#178A45`
- Avatar accent rotation (assign per user, cycling): `#4C5FE8, #FF6B6B, #F2A93B, #2EC4B6, #8B5CF6, #FF8FB1`

### Typography
- Display/headings: **Manrope**, weight 800 (extrabold), tight tracking (~-0.01 to -0.02em).
- Body/UI text: system font stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) — reads as native Android/iOS text.
- Sizes in use: 22px (screen headings), 19px (modal titles), 16-17px (card titles / buttons), 15px (body/list rows), 13-13.5px (secondary/meta), 11.5-12px (tag chips, captions, eyebrow labels).

### Shape & elevation
- Card radius: 20px. Button/pill radius: 14px (functionally full-pill for small buttons since height ≈ radius×2). Input radius: 12px. Avatars and icon buttons: fully circular (999px).
- Card shadow: `0 1px 3px rgba(20,20,43,0.07), 0 1px 2px rgba(20,20,43,0.05)`.
- Raised/CTA shadow: `0 6px 18px rgba(76,95,232,0.28)` (primary-tinted, used under the main "My gift list" tile and primary buttons).
- Top bar shadow: `0 2px 8px rgba(20,20,43,0.12)`.

### Spacing
Screen padding: 16-20px sides. Card internal padding: 14×16px. Gaps between stacked cards: 10-12px. Section label margin: 24px top / 12px bottom.

## Assets
- No external image/logo assets — the logo is a simple inline gift-box icon (Lucide-style, 2px stroke, rounded caps) inside a primary-colored rounded square, next to the "Giftly" wordmark text.
- Gift cover images: in the prototype these are simulated via `picsum.photos/seed/{giftId}/400/300` placeholders whenever a link is present. In production, replace with a real link-preview/OpenGraph-image fetch (this typically requires a small backend proxy, since browsers can't fetch arbitrary cross-origin page metadata directly) — fall back to no image if the link has no fetchable preview or is empty.
- All icons are inline SVG, Lucide-style (24×24, 2-2.4px stroke, rounded caps/joins, `currentColor`) — no icon font, no emoji.

## Files
- `Giftly.dc.html` — the full interactive prototype (single-file React component). Every screen, modal, and interaction described above is implemented here and can be opened directly in a browser to click through the real behavior.
- `screenshots/` — reference screenshots of every screen and modal, in flow order:
  1. `01-user-select.png` — pre-login name picker
  2. `02-password-step.png` — password entry
  3. `03-home.png` — home hub
  4. `04-my-list.png` — own gift list editor
  5. `05-add-gift-modal.png` — add/edit gift form
  6. `06-other-member-list.png` — browsing another member's list (claim view)
  7. `07-claim-modal.png` — claiming a gift + picking the gift date
  8. `08-admin-panel.png` — admin user management
  9. `09-add-family-member-modal.png` — add/edit user form
  10. `10-delete-user-confirm.png` — type-to-confirm user deletion
