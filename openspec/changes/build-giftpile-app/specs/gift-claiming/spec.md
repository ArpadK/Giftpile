## ADDED Requirements

### Requirement: Gift visibility pure function
The system SHALL compute gift visibility as a pure function of `(gift, viewerId, ownerId, isBlindContext)` on the server before returning any list response. This function SHALL be the single source of truth for all three list contexts (My List, Admin-edit List, Other-member List).

#### Scenario: Owner views own list
- **WHEN** the authenticated user requests their own gift list
- **THEN** the system applies blind context: all gifts are returned without any claim fields in the response

#### Scenario: Admin edits another user's list
- **WHEN** an admin navigates into another user's list in admin-edit mode
- **THEN** the system applies blind context for that owner: gifts are returned without claim fields

#### Scenario: Viewer requests another member's list
- **WHEN** an authenticated user requests a gift list they do not own
- **THEN** the system applies the full visibility rules (hiding, claim data for viewer only, etc.)

### Requirement: Claim a gift (non-repeatable)
The system SHALL allow a viewer to claim a non-repeatable gift (`onlyOnce = true`) by tapping "I'll get this one". Tapping opens a bottom-sheet modal where the viewer picks a gift date and confirms. Only one claim SHALL exist for a non-repeatable gift at any time.

#### Scenario: Successful claim
- **WHEN** a viewer selects a gift date and confirms in the claim modal
- **THEN** a claim record is created (viewer's userId, selected date), the gift shows as claimed (struck-through title, green info bar with date) in the viewer's view of that list, and the gift disappears from all other viewers' lists

#### Scenario: Attempt to claim already-claimed gift
- **WHEN** a viewer requests a non-repeatable gift list and another user has already claimed a given gift
- **THEN** that gift is absent from the response — the viewer cannot see or claim it

#### Scenario: Edit own claim date
- **WHEN** the claimer taps "Edit" on a gift they claimed
- **THEN** the claim modal reopens pre-filled with the existing date, allowing them to change it

#### Scenario: Un-claim (I didn't give this after all)
- **WHEN** the claimer taps "I didn't give this after all" in the edit-claim modal
- **THEN** the claim is deleted, the gift reappears as available to all viewers, and no received state is set

### Requirement: Claim a gift (repeatable)
The system SHALL allow multiple viewers to independently claim a repeatable gift (`onlyOnce = false`) simultaneously. Each claimer SHALL only see their own claim. Other claimers' claims SHALL never be exposed.

#### Scenario: Two viewers claim the same repeatable gift
- **WHEN** two different viewers each claim the same repeatable gift
- **THEN** each viewer sees only their own claim on that gift; the gift remains visible and claimable by other viewers

#### Scenario: Repeatable gift never auto-receives
- **WHEN** the gift date of a repeatable gift's claim passes
- **THEN** the gift does NOT automatically flip to received and remains in the active list

### Requirement: Auto-receive after gift date (non-repeatable only)
The system SHALL automatically compute `effectiveReceived = true` for a non-repeatable gift when `today > claim.date`. This computation SHALL happen at read time on the server (no scheduled job). A gift that becomes `effectiveReceived` SHALL appear in the received section for all viewers (including those who previously could not see it as claimed) — marked "Received" with no claim attribution.

#### Scenario: Gift date has not yet passed
- **WHEN** today is on or before the claim date of a non-repeatable gift
- **THEN** `effectiveReceived` is false; the gift remains hidden from all viewers except the claimer

#### Scenario: Gift date has passed
- **WHEN** today is strictly after the claim date of a non-repeatable gift
- **THEN** `effectiveReceived` is true; the gift appears as "Received" in the received section for all viewers; no claim attribution is shown

#### Scenario: Claimer can still edit after reveal
- **WHEN** the gift date has passed and the claimer views the gift list
- **THEN** the claimer still sees their claim with an "Edit" pill allowing them to correct the date or un-claim

### Requirement: Owner remains permanently blind to claim data
The system SHALL never include claim data in any response for a gift when the requester is the gift owner, regardless of claim status or gift date.

#### Scenario: Owner's received section after reveal
- **WHEN** a non-repeatable gift auto-reveals to received and the owner views their own list
- **THEN** the gift appears in the owner's received section labeled "Received" only — no claim data (claimer, date) is present in the response

#### Scenario: Admin editing owner's list is also blind
- **WHEN** an admin enters admin-edit mode for a user's list
- **THEN** the response applies blind context; no claim data is returned regardless of the admin's identity

### Requirement: Claim bottom-sheet modal UX
The claim modal SHALL include: a title ("Give '{gift title}'"), helper copy ("Pick the day you plan to give this. It'll stay a secret until the day after."), a native date input, a primary "Confirm — I'll give this" / "Update date" button, and — only when editing an existing claim — a red "I didn't give this after all" button.

#### Scenario: New claim modal
- **WHEN** a viewer opens the claim modal for an unclaimed gift
- **THEN** the date input is empty, only the "Confirm" button is shown (no un-claim button)

#### Scenario: Edit claim modal
- **WHEN** a viewer opens the claim modal for a gift they already claimed
- **THEN** the date input is pre-filled with the existing date and the red "I didn't give this after all" button is visible
