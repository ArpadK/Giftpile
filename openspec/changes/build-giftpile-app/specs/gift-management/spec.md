## ADDED Requirements

### Requirement: Gift data model
The system SHALL persist gift ideas with the following fields: `id` (generated), `ownerId` (FK to user), `title` (required string), `link` (optional URL), `price` (optional string), `description` (optional text), `exactColor` (boolean, default false), `exactProduct` (boolean, default false), `onlyOnce` (boolean, default true), `manualReceived` (boolean, default false), `priority` (integer, owner-controlled sort order).

#### Scenario: Gift created with title only
- **WHEN** a user submits the gift form with only a title
- **THEN** the system persists the gift with all optional fields null/default and returns the created gift

#### Scenario: Gift created with all fields
- **WHEN** a user submits the gift form with title, link, price, description, and flag values
- **THEN** the system persists all provided values and returns the created gift

### Requirement: Add gift via bottom-sheet modal
The system SHALL provide an "+ Add a gift idea" pill button at the top of the My List screen. Tapping it SHALL open a bottom-sheet modal with fields: Title (required), Link (optional URL), Price (optional), Notes (optional multi-line), and three checkboxes: "Must be this exact color" (default unchecked), "Must be this exact product / brand" (default unchecked), "Only give this once" (default checked).

#### Scenario: Submit without title
- **WHEN** the user submits the gift form with an empty title
- **THEN** the system displays a validation error and does not create the gift

#### Scenario: "Only give this once" default
- **WHEN** the add-gift modal opens for a new gift
- **THEN** the "Only give this once" checkbox is checked by default

#### Scenario: Successful gift creation
- **WHEN** the user submits a valid gift form
- **THEN** the modal closes, the gift appears at the top of the active list, and its priority is set to the highest position

### Requirement: Edit gift via bottom-sheet modal
The system SHALL allow the gift owner (and an admin in edit mode) to edit any field of an existing gift via the same bottom-sheet modal pre-filled with current values.

#### Scenario: Edit preserves unchanged fields
- **WHEN** the user opens the edit modal and changes only the price, then submits
- **THEN** all other fields retain their previous values

#### Scenario: Link updated
- **WHEN** the user updates the link field and submits
- **THEN** the gift card reflects the new link and triggers a fresh link-preview fetch

### Requirement: Delete gift with confirmation
The system SHALL require a lightweight confirmation dialog before deleting a gift. The dialog SHALL show the gift title and require a single tap on "Remove" to confirm (no typed confirmation).

#### Scenario: User confirms deletion
- **WHEN** the user taps the delete icon and confirms in the dialog
- **THEN** the gift is permanently removed from the list

#### Scenario: User cancels deletion
- **WHEN** the user taps the delete icon and taps Cancel in the dialog
- **THEN** no deletion occurs and the list is unchanged

### Requirement: Manual received toggle
The system SHALL allow the gift owner (and an admin in edit mode) to manually mark an active gift as received via a green-tinted circular button on the gift card. Marking as received removes the gift from the active list and places it in a collapsed "received" section.

#### Scenario: Mark as received
- **WHEN** the user taps the "mark received" button on an active gift card
- **THEN** the gift moves to the received section and the active list updates immediately

#### Scenario: Undo received
The system SHALL provide an "Undo" pill on each received gift card in the received section, allowing the owner to move a gift back to active.

- **WHEN** the user taps the "Undo" pill on a received gift
- **THEN** the gift moves back to the active list at its previous priority position (or bottom if indeterminate)

### Requirement: Priority reordering (up/down)
The system SHALL allow the gift owner (and admin in edit mode) to reorder active gifts using up (↑) and down (↓) icon buttons on each gift card. The up button SHALL be disabled (and visually faded) for the first item; the down button SHALL be disabled for the last item. Priority changes only affect the active list; received gifts are not reordered.

#### Scenario: Move gift up
- **WHEN** the user taps the up button on a gift that is not first
- **THEN** the gift swaps position with the gift above it and both cards re-render in the new order

#### Scenario: Move gift down
- **WHEN** the user taps the down button on a gift that is not last
- **THEN** the gift swaps position with the gift below it

#### Scenario: Up button at top
- **WHEN** the user views a gift card for the first gift in the active list
- **THEN** the up button is rendered in a disabled/faded state and does not respond to taps

### Requirement: Received section toggle
The system SHALL provide a "Show / Hide received gifts" toggle below the active list. Received gifts SHALL be displayed at 60% opacity with an "Undo" pill and delete button. The section SHALL be collapsed by default.

#### Scenario: No received gifts
- **WHEN** the user's gift list has no received gifts
- **THEN** the "Show received gifts" toggle is not rendered

#### Scenario: Toggle shows received section
- **WHEN** the user taps "Show received gifts"
- **THEN** the received gifts section expands and the toggle label changes to "Hide received gifts"
