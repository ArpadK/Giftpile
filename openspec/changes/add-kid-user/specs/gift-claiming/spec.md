## MODIFIED Requirements

### Requirement: Gift visibility pure function
The system SHALL compute gift visibility as a pure function of `(gift, viewerId, ownerId, context)`
on the server before returning any list response, where `context` is one of **blind** (owner or
non-manager admin editing), **reveal** (an ordinary viewer), or **guardian** (a viewer who manages
the kid who owns the list). This function SHALL be the single source of truth for every list
context (My List, Admin-edit List, Other-member List, and Guardian List).

#### Scenario: Owner views own list
- **WHEN** the authenticated user requests their own gift list
- **THEN** the system applies blind context: all gifts are returned without any claim fields in the
  response

#### Scenario: Admin edits another user's list
- **WHEN** an admin who does not manage the owner navigates into another user's list in admin-edit
  mode
- **THEN** the system applies blind context for that owner: gifts are returned without claim fields

#### Scenario: Viewer requests another member's list
- **WHEN** an authenticated user who is neither the owner nor a manager of the owner requests a
  gift list
- **THEN** the system applies the full reveal rules (hiding claimed non-repeatable gifts, exposing
  claim data for the viewer's own claim only)

#### Scenario: Guardian requests their kid's list
- **WHEN** a user who manages the kid who owns the list requests that list
- **THEN** the system applies guardian context: every gift is returned (nothing hidden), and each
  gift includes full claim data (the claimer's identity and gift date for every claim)

### Requirement: Owner remains permanently blind to claim data
The system SHALL never include claim data in any response for a gift when the requester is the gift
owner, regardless of claim status or gift date. This SHALL also hold for an admin editing a list
they do not manage. This blindness SHALL NOT apply to a guardian viewing a kid they manage: a
guardian receives full claim data (see the guardian context of the gift-visibility function).

#### Scenario: Owner's received section after reveal
- **WHEN** a non-repeatable gift auto-reveals to received and the owner views their own list
- **THEN** the gift appears in the owner's received section labeled "Received" only — no claim data
  (claimer, date) is present in the response

#### Scenario: Admin editing owner's list is also blind
- **WHEN** an admin who does not manage the owner enters admin-edit mode for a user's list
- **THEN** the response applies blind context; no claim data is returned regardless of the admin's
  identity

#### Scenario: Kid viewing own list stays blind
- **WHEN** a login-enabled kid views their own list
- **THEN** blind context applies and no claim data is returned, even though the kid's guardians can
  see claim data on that same list

#### Scenario: Guardian is exempt from owner blindness
- **WHEN** a guardian views the list of a kid they manage
- **THEN** the response includes claim data (claimer identity and gift date) for every claim on the
  list

## ADDED Requirements

### Requirement: Claim attribution in guardian context
When returning a list in guardian context, the system SHALL include, for each claimed gift, the
claimer's identity (name and avatar color) and the gift date. For repeatable gifts with multiple
claims, all claims SHALL be included. This is the only context in which another user's claim
attribution is exposed.

#### Scenario: Guardian sees who claimed a non-repeatable gift
- **WHEN** a guardian views their kid's list and a non-repeatable gift has been claimed by another
  user
- **THEN** the response shows the gift as claimed with that user's name, avatar color, and the gift
  date

#### Scenario: Guardian sees all claims on a repeatable gift
- **WHEN** a guardian views their kid's list and a repeatable gift has been claimed by more than
  one user
- **THEN** the response includes every claim with its claimer identity and gift date
