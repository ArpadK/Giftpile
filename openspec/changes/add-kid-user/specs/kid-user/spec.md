## ADDED Requirements

### Requirement: Kid user account
The system SHALL support a kid user: a `User` with `isKid = true` that represents a child whose
list is curated by others. A kid user SHALL own a gift list exactly like any other user. Kid
status SHALL be independent of the admin role, and a kid user SHALL never be an admin.

#### Scenario: Kid owns a gift list
- **WHEN** an admin creates a kid user
- **THEN** the kid has an ownable gift list and appears in the authenticated Family list for all
  users so anyone can view it and give gifts

#### Scenario: Kid cannot be an admin
- **WHEN** an admin attempts to set both `isKid` and `isAdmin` on the same user
- **THEN** the system rejects the request with a validation error

### Requirement: Parent (manager) relationship
The system SHALL allow zero or more parent (manager) users to be assigned to a kid user via a
`kid_managers` relationship. The relationship SHALL be many-to-many: a kid may have several
parents, and a parent may manage several kids. A user assigned as a manager is a "guardian" of
that kid's list.

#### Scenario: Assign parents to a kid
- **WHEN** an admin assigns one or more non-kid users as managers of a kid
- **THEN** each assigned user becomes a guardian of that kid's list

#### Scenario: Kid cannot manage another kid
- **WHEN** an admin attempts to assign a kid user as a manager of another kid
- **THEN** the system rejects the assignment with a validation error

#### Scenario: Removing a parent revokes access
- **WHEN** an admin removes a user from a kid's managers
- **THEN** that user loses guardian access and thereafter sees the kid's list under the normal
  reveal rules like any other family member

### Requirement: Guardian regular view of a kid's list
A guardian viewing a kid's list through the normal member-list path SHALL see every gift on the
list without the reveal-rule hiding applied, with each claimed gift showing the claimer's identity
and gift date. The guardian SHALL have the normal claim/unclaim controls so they can claim gifts
directly without entering the edit view.

#### Scenario: Guardian sees claimed gifts instead of them being hidden
- **WHEN** a guardian opens their kid's list from the Family list and another user has claimed a
  non-repeatable gift
- **THEN** the gift remains visible and shows it is claimed, by whom, and the gift date — it is not
  hidden

#### Scenario: Guardian claims a gift from the regular view
- **WHEN** a guardian taps an unclaimed gift on their kid's list and confirms a claim
- **THEN** the claim is created with the guardian as claimer and is visible to the kid's other
  guardians

#### Scenario: Non-guardian sees the kid's list normally
- **WHEN** a user who does not manage the kid opens the kid's list
- **THEN** the standard reveal rules apply (claimed non-repeatable gifts are hidden, only the
  viewer's own claim is shown)

### Requirement: Guardian edit view of a kid's list
A guardian's kid list regular view SHALL offer a "Manage list" control (visible only to guardians)
that enters an edit view. The edit view SHALL provide the same full editing controls a user has on
their own list — add, edit, delete, reorder, and mark-received — over the same all-gifts-with-claims
data, and SHALL show a banner indicating the guardian is editing the kid's list on their behalf.

#### Scenario: Guardian enters the edit view
- **WHEN** a guardian taps "Manage list" on their kid's regular list view
- **THEN** the edit view opens with full add/edit/delete/reorder/mark-received controls and a
  banner indicating this is the kid's list being edited on their behalf

#### Scenario: Manage control hidden from non-guardians
- **WHEN** a user who does not manage the kid views the kid's list
- **THEN** no "Manage list" control is shown

#### Scenario: Guardian edits a gift the kid owns
- **WHEN** a guardian adds or edits a gift from the edit view
- **THEN** the gift is created or updated with the kid as owner

### Requirement: Upgrade a kid to a full user
The system SHALL allow an admin to upgrade a kid user to a full (non-kid) user. Upgrading SHALL
clear `isKid`, remove all manager relationships (revoking every parent's guardian access), and
require that the user can log in with a password. The kid's existing gifts and the claims made on
them SHALL be preserved.

#### Scenario: Successful upgrade
- **WHEN** an admin upgrades a kid to a full user and login/password requirements are satisfied
- **THEN** the user is no longer a kid, has no managers, retains all their gifts and claims, and
  behaves as an ordinary user

#### Scenario: Former parents lose access after upgrade
- **WHEN** a kid has been upgraded to a full user
- **THEN** the users who were previously that kid's parents can only view the now-full user's list
  under the normal reveal rules
