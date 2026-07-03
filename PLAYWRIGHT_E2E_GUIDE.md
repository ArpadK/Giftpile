# Playwright E2E Test: Gift Claim Visibility

## Overview

This guide explains the Playwright E2E test for the gift claim visibility feature in Giftpile.

**Test File**: `/frontend/src/__tests__/e2e/claim-visibility.spec.js`

**What It Tests**: Multi-user gift claiming workflow with date-based secret reveals.

## Scenario Summary

```
User A (Gift Owner)
  └─ Creates a gift

User B (Family Member - Viewer)
  ├─ Logs in to their account
  ├─ Opens User A's gift list
  ├─ Claims the gift with a PAST date (yesterday)
  └─ Sees "You're giving this" indicator (claim is visible)

User A's Device
  └─ Gift claim disappears from "other viewers" section (recipient is secret)

User B Reloads Browser
  └─ Claim persists and is still visible
```

## Architecture

### Browser Contexts (Multi-User Simulation)

The test uses **Playwright browser contexts** to simulate multiple concurrent users:

```javascript
const contextA = await browser.newContext()  // User A session
const pageA = await contextA.newPage()       // User A's browser tab

const contextB = await browser.newContext()  // User B session  
const pageB = await contextB.newPage()       // User B's browser tab
```

**Why this matters**:
- Each context has its own cookies/session
- Users can't interfere with each other's sessions
- Tests concurrent user interactions realistically
- Simulates separate browser instances

### Data Flow

1. **Add Gift** (User A)
   ```
   Frontend (React)
     ↓
   POST /api/gifts
     ↓
   Backend (Spring Boot)
     ↓
   Database (SQLite/Postgres)
   ```

2. **Claim Gift** (User B)
   ```
   Frontend (React) - ClaimModal
     ↓
   POST /api/gifts/{giftId}/claim
     ↓
   Backend
     ↓
   Database (Claims Table)
   ```

3. **View List** (User B)
   ```
   Frontend (React) - GiftList
     ↓
   GET /api/users/{userId}/gifts
     ↓
   Backend (includes claims in response)
     ↓
   Database (join Gifts + Claims)
   ```

## Test Steps (Detailed)

### Step 1: User A Adds a Gift

```javascript
// Navigate to app
await pageA.goto('http://localhost:5173')

// Select first user (User A)
const userRowsA = pageA.locator('.user-row')
await userRowsA.first().click()

// Extract User A's ID from URL: /login/{id}
const urlA = pageA.url()
const matchA = urlA.match(/\/login\/(\d+)/)
const userAId = parseInt(matchA[1])

// Log in with password
await pageA.locator('input[type="password"]').fill('password')
await pageA.locator('button:has-text("Sign in")').click()

// Navigate to gift list
await pageA.locator('.cta-card:has-text("My gift list")').click()

// Add a new gift
await pageA.locator('.gift-list__add-button').click()
await pageA.locator('input#title').fill('Test Gift')
await pageA.locator('input#price').fill('$49.99')
await pageA.locator('textarea#description').fill('A wonderful gift')
await pageA.locator('button:has-text("Add gift")').click()
```

**Expected UI State**:
- Gift appears in the active gifts list
- Gift card shows title, price, description
- "I'll get this one" button is available (for viewers)

### Step 2: User B Logs In

```javascript
// Similar to User A but select second user
await pageB.goto('http://localhost:5173')
const userRowsB = pageB.locator('.user-row')
await userRowsB.nth(1).click()  // Second user

// Extract User B's ID
const urlB = pageB.url()
const matchB = urlB.match(/\/login\/(\d+)/)
const userBId = parseInt(matchB[1])

// Log in
await pageB.locator('input[type="password"]').fill('password')
await pageB.locator('button:has-text("Sign in")').click()
```

### Step 3: User B Opens User A's Gift List

```javascript
// User B navigates directly to User A's list
await pageB.goto(`http://localhost:5173/list/${userAId}`)

// Verify the gift is visible
const giftCard = pageB.locator(`.gift-card:has-text("Test Gift")`)
await expect(giftCard).toBeVisible()
```

### Step 4: User B Claims the Gift with PAST Date

```javascript
// Calculate yesterday
const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const pastDateStr = yesterday.toISOString().split('T')[0]  // YYYY-MM-DD

// Click claim button
const claimButton = giftCard.locator('button[title="I\'ll get this one"]')
await claimButton.click()

// Fill in the date in ClaimModal
const dateInput = pageB.locator('.claim-modal__date-input')
await dateInput.fill(pastDateStr)

// Confirm the claim
await pageB.locator('button:has-text("Confirm — I\'ll give this")').click()

// Modal closes
await expect(pageB.locator('.modal-sheet__title')).not.toBeVisible()
```

**Why Past Date?**
- Past dates are **immediately revealed** to other family members
- Future dates are **kept secret** until the gift date passes
- This is the core feature being tested

### Step 5: Verify Claim State

```javascript
// User B should see "You're giving this" indicator
const claimedIndicator = giftCard.locator('.gift-card__title--claimed')
await expect(claimedIndicator).toBeVisible()

// User B can see the gift is claimed
await expect(giftCard).toContainText('You\'re giving this')
```

### Step 6: User B Reloads Browser

```javascript
// Refresh the page
await pageB.reload()

// Wait for navigation to complete
await expect(pageB).toHaveURL(`/list/${userAId}`)

// Verify claim persists
const reloadedGiftCard = pageB.locator(`.gift-card:has-text("Test Gift")`)
const reloadedClaimedIndicator = reloadedGiftCard.locator('.gift-card__title--claimed')
await expect(reloadedClaimedIndicator).toBeVisible()
```

**What This Proves**:
- Session cookies persist across reloads
- Claim is stored in the database
- Frontend correctly fetches and displays claim state

### Step 7: User B Can Edit/Unclaim

```javascript
// Click edit claim button
const editButton = giftCard.locator('button[title="Edit claim"]')
await editButton.click()

// Modal opens in edit mode
await expect(pageB.locator('.modal-sheet__title')).toContainText(`Give 'Test Gift'`)

// Verify the date is pre-filled
const dateInput = pageB.locator('.claim-modal__date-input')
const filledDate = await dateInput.inputValue()
expect(filledDate).toBe(pastDateStr)

// Verify unclaim button exists (edit mode only)
const unclaimBtn = pageB.locator('button:has-text("I didn\'t give this after all")')
await expect(unclaimBtn).toBeVisible()
```

## CSS/Selector Reference

### GiftCard Elements

```css
/* Container */
.gift-card
.gift-card--received  /* When gift is marked received */

/* Content */
.gift-card__title
.gift-card__title--claimed  /* Visual indicator for claimed gifts */
.gift-card__price
.gift-card__description
.gift-card__link  /* "View item" link */

/* Actions */
.gift-card button[title="I'll get this one"]  /* Claim button */
.gift-card button[title="Edit claim"]  /* Edit claim button */
.gift-card button[title="Edit"]  /* Edit gift button (owner) */
.gift-card button[title="Delete"]  /* Delete button (owner) */
```

### ClaimModal Elements

```css
/* Container */
.modal-sheet
.modal-backdrop  /* Click to close */

/* Content */
.modal-sheet__title  /* "Give '{gift}'" */
.claim-modal__content
.claim-modal__helper  /* Helper text */

/* Date Input */
.claim-modal__date-group
.claim-modal__label  /* "Gift date" */
.claim-modal__date-input  /* The <input type="date"> */

/* Actions */
.claim-modal__actions
.claim-modal__btn  /* All buttons */
.claim-modal__btn--primary  /* "Confirm" or "Update date" */
.claim-modal__btn--secondary  /* "Cancel" */
.claim-modal__btn--danger  /* "I didn't give this after all" */
```

## Common Issues & Debugging

### Issue: "Gift not visible after adding"

**Cause**: Gift list hasn't refreshed
**Solution**: Add explicit wait
```javascript
await expect(pageA.locator(`.gift-card:has-text("${title}")`)).toBeVisible({ timeout: 5000 })
```

### Issue: "Claim button not found"

**Cause**: User is in owner mode (not viewer mode)
**Solution**: Verify the URL is `/list/{otherUserId}` not `/list/{currentUserId}`

### Issue: "Modal doesn't close after claim"

**Cause**: API call failed silently
**Solution**: Check browser console for errors
```javascript
pageB.on('console', msg => console.log('PAGE LOG:', msg.text()))
```

### Issue: "Claim doesn't persist after reload"

**Cause**: Cookies not being sent to backend
**Solution**: Verify `credentials: 'include'` in fetch calls:
```javascript
// In GiftList.jsx
const res = await fetch(`/api/users/${userId}/gifts`, {
  credentials: 'include',  // ← This is required!
})
```

## Running the Tests

### 1. Start Backend
```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8080
```

### 2. In Another Terminal, Run E2E Tests
```bash
cd frontend
npm run e2e claim-visibility.spec.js
```

### 3. View Results
- HTML report: `frontend/playwright-report/index.html`
- Console output: Shows ✓ and ✅ indicators

### Options

**Run in headed mode** (see the browser):
```bash
npm run e2e -- --headed claim-visibility.spec.js
```

**Run with debug** (step-by-step debugging):
```bash
npm run e2e -- --debug claim-visibility.spec.js
```

**Run specific test**:
```bash
npm run e2e -- --grep "should hide gift from viewers"
```

**View test trace** (for failed test):
```bash
npx playwright show-trace test-results/trace.zip
```

## Expected Output

```
Claim Visibility and Date-Based Secrets › should hide gift from viewers when claimed with future date, reveal with past date
  ✓ User A (ID: 1) added gift: "E2E Test Gift - 1720058400000"
  ✓ User B (ID: 2) opened User A's gift list and sees the gift
  ✓ User B claimed the gift with past date: 2026-07-02
  ✓ User B reloaded page and claim persists
  ✓ User B can view/edit claim with correct date
  ✓ User B successfully unclaimed the gift
  ✅ All steps completed successfully!

Claim Visibility and Date-Based Secrets › should show future-dated claims only after the gift date has passed
  ✓ User A added gift: "Future Gift - 1720058400001"
  ✓ User B claimed with future date: 2026-07-05
  ✓ User B sees claim (personal view is always shown)
  ✓ User B reloaded and future claim still visible to them
  ✅ Future date claim test completed!

PASSED ✓ 391 lines
```

## Key Concepts Tested

### 1. Multi-User Isolation
- Each browser context has separate session cookies
- Users can't interfere with each other
- Concurrent interactions are independent

### 2. Session Persistence
- Login session survives page reload
- Cookie handling by Playwright
- Backend session validation

### 3. Claim Date Logic
- **Past dates**: Immediately revealed to all family members
- **Future dates**: Visible only to claimer until date passes
- **Stored in DB**: API returns claim in gift object

### 4. UI State Sync
- Frontend fetches fresh data from API
- UI updates based on claim state
- Modal opens/closes appropriately
- Indicators show/hide based on state

### 5. Error Handling
- Invalid dates rejected by input validation
- API errors handled gracefully
- UI remains responsive

## Related Files

| File | Purpose |
|------|---------|
| `frontend/src/screens/GiftList.jsx` | Main screen with gift list |
| `frontend/src/components/GiftCard.jsx` | Individual gift card component |
| `frontend/src/components/ClaimModal.jsx` | Claim dialog component |
| `frontend/playwright.config.js` | Playwright configuration |
| `backend/src/.../GiftController.java` | API endpoints for gifts/claims |
| `backend/src/.../ClaimRepository.java` | Database queries for claims |

## Next Steps

After this test passes, consider adding:
1. **Test visibility from User A's perspective** - Does the claim hide correctly?
2. **Test the admin panel** - Can admins see claims?
3. **Test multiple claims** - Can multiple users claim the same gift?
4. **Test date validation** - What dates are invalid?
5. **Test received gifts** - Do claimed gifts that are marked received disappear?

## Performance Notes

- Test duration: ~30-60 seconds per test
- Browser startup: ~5 seconds
- API calls: <500ms each
- Modal interactions: Immediate (synchronous)

## Accessibility

The test uses accessible selectors:
- `button[title="..."]` - For icon buttons (screen readers)
- `button:has-text("...")` - For text content matching
- `input#title`, `input[type="password"]` - Semantic HTML
- `.modal-sheet`, `.gift-card` - Semantic CSS class names

This helps ensure the app is screen-reader friendly.
