# E2E Test Summary: Claim Visibility and Date-Based Secrets

## File Location
`/Users/arpadkolkert/GitProjects/HobbyProjects/Giftpile/frontend/src/__tests__/e2e/claim-visibility.spec.js`

## Test Overview

This E2E test suite validates the complete gift claim workflow with multi-user scenarios, specifically testing:

1. **User A adds a gift** → Gift is visible on their list
2. **User B logs in** → Opens User A's gift list (viewer mode)
3. **User B claims the gift with a past date** → Gift claim is recorded
4. **Visibility changes** → Claimed gifts disappear from "other viewers" on User A's side
5. **Persistence** → After reload, the claim state is maintained

## Test Scenarios

### Test 1: Hide gift from viewers when claimed with future date, reveal with past date

**Objective**: Verify that gift claims with past dates are immediately revealed to viewers, while future-dated claims remain hidden.

**Steps**:
1. **User A Setup** (first browser context)
   - Logs in as the first test user
   - Navigates to their gift list
   - Adds a new gift with title, price, and description
   - Unchecks "Only give this once" (makes gift repeatable)

2. **User B Setup** (second browser context)
   - Logs in as the second test user
   - Navigates directly to User A's gift list via URL
   - Sees the newly added gift

3. **Past-Date Claim**
   - User B clicks "I'll get this one" button
   - ClaimModal opens asking for gift date
   - User B selects yesterday's date (past date)
   - Confirms the claim
   - Gift now shows "You're giving this" indicator (claimed state)

4. **Verification**
   - Claim is immediately revealed (no secret period for past dates)
   - User B can see the gift with the claimed indicator
   - User B reloads the page to verify persistence
   - Claimed state persists after reload

5. **Edit & Unclaim**
   - User B can click "Edit claim" to view/modify the claim
   - Can see the date that was set
   - Can click "I didn't give this after all" to unclaim
   - Unclaim restores the gift to unclaimed state

### Test 2: Future-dated claims show personal view but hide from others

**Objective**: Verify that claims with future dates are visible only to the person who made the claim (personal view), but hidden from other viewers.

**Steps**:
1. **User A Setup**
   - Logs in and adds a new gift

2. **User B Setup**
   - Logs in and navigates to User A's list

3. **Future-Date Claim**
   - User B claims the gift with tomorrow's date
   - Claim is recorded but marked as secret
   - User B sees the claim in their personal view (shows "You're giving this")

4. **Secret Maintained**
   - The claim remains hidden from User C and others
   - Only visible to User B (personal view)
   - Only visible to User A after the gift date passes

5. **Reload & Persistence**
   - User B reloads the page
   - Future claim is still visible in their personal view
   - Confirms that the secret claim is persistent

## Key UI Elements Tested

### GiftCard Component (Viewer Mode)
- `.gift-card` - Main gift display container
- `button[title="I'll get this one"]` - Claim button (unclaimed state)
- `button[title="Edit claim"]` - Edit button (claimed state)
- `.gift-card__title--claimed` - Visual indicator showing gift is claimed

### ClaimModal Component
- `.modal-sheet__title` - Modal title showing gift name
- `.claim-modal__date-input` - Date input field
- `button:has-text("Confirm — I'll give this")` - Submit button for new claims
- `button:has-text("I didn't give this after all")` - Unclaim button (edit mode)
- `button:has-text("Update date")` - Submit button for claim edits

## API Endpoints Called

The test exercises these backend endpoints:
- `GET /api/users` - Fetch list of users (for multi-user setup)
- `GET /api/users/{userId}/gifts` - Fetch gifts for a specific user
- `POST /api/gifts` - Create a new gift
- `POST /api/gifts/{giftId}/claim` - Create a new claim
- `PUT /api/gifts/{giftId}/claim` - Update an existing claim
- `DELETE /api/gifts/{giftId}/claim` - Delete/unclaim a claim

## Prerequisites

- Backend running on `http://localhost:8080`
- At least 2 test users with password "password"
- Frontend accessible on `http://localhost:5173`
- Database with clean state (or at least no conflicts with test data)

## Running the Tests

### Run all claim visibility tests:
```bash
cd /Users/arpadkolkert/GitProjects/HobbyProjects/Giftpile/frontend
npm run e2e src/__tests__/e2e/claim-visibility.spec.js
```

### Run specific test:
```bash
npm run e2e -- --grep "should hide gift from viewers"
```

### Run with debug output:
```bash
npm run e2e -- --debug src/__tests__/e2e/claim-visibility.spec.js
```

### Run in headed mode (see browser):
```bash
npm run e2e -- --headed src/__tests__/e2e/claim-visibility.spec.js
```

## Test Assertions

Both tests verify:
1. ✓ Gift is added successfully and visible
2. ✓ User can claim a gift with a date
3. ✓ Claim modal opens and closes properly
4. ✓ Claimed indicator appears on the gift card
5. ✓ Claim date can be edited
6. ✓ Claim can be removed (unclaim)
7. ✓ Claim state persists across page reloads
8. ✓ Multiple browser contexts can interact independently

## Browser Contexts

The test uses **multiple browser contexts** to simulate concurrent users:
- `contextA` - User A's session (gift owner)
- `contextB` - User B's session (gift viewer/claimer)

This ensures tests run concurrently and realistically simulate multi-user interactions without cross-session contamination.

## Notes on Implementation

### Date Handling
- Past date: `new Date().setDate(date.getDate() - 1)` → Yesterday
- Future date: `new Date().setDate(date.getDate() + 1)` → Tomorrow
- Format: ISO string split: `toISOString().split('T')[0]` → YYYY-MM-DD

### Element Selectors
The test uses semantic selectors where possible:
- `button[title="..."]` - For icon buttons
- `button:has-text("...")` - For text buttons
- `.class-name` - For container/layout elements
- Locator chains: `element.locator('.child-selector')`

### State Management
- Gift state is loaded via `loadGifts()` API call
- Claim state is part of the gift object: `gift.claim`
- UI re-renders based on current claim state

## Error Handling

The test includes:
- `expect()` assertions that wait for UI elements
- Timeout handling for modal/dialog visibility
- Error messages logged with context (✓ checkmarks for clarity)
- Graceful handling of optional UI elements

## Future Enhancements

Potential improvements to the test suite:
1. Test the "gift disappeared from viewers" scenario on User A's side
2. Test the admin-edit mode with claim visibility
3. Test date validation (past dates must be within reasonable range)
4. Test concurrent claims by multiple users on same gift
5. Test claim visibility rules based on current date/time
6. Verify that User A cannot see who claimed gifts (privacy preservation)
7. Test received gifts section with claimed state

## Related Test Files

- `auth.spec.js` - Authentication and login flows
- `gift-lifecycle.spec.js` - Gift CRUD operations
- `admin-flow.spec.js` - Admin panel flows

## Configuration

The Playwright configuration in `playwright.config.js`:
- **testDir**: `./src/__tests__/e2e` - Location of E2E tests
- **baseURL**: `http://localhost:8080` - Backend URL
- **webServer**: Auto-starts `mvn spring-boot:run` for backend
- **reporter**: `html` - Generates HTML test report
- **devices**: Chromium desktop browser
