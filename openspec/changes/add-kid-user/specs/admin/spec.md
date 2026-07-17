## MODIFIED Requirements

### Requirement: Add / edit family member
The admin panel SHALL provide a full-width "+ Add family member" pill button. Tapping it SHALL open
a modal for adding a new user with fields: Name (required), a "Kid account" toggle, Password, Is
Admin (checkbox), and — for kids — a "Can log in" toggle and a Parents multiselect. Password
requirements depend on account type: it is required for a new non-kid user and for a kid whose "Can
log in" is on; it is optional (may be left blank) for a kid who cannot log in and when editing
(leave blank to keep current). The Is Admin checkbox and the Kid toggle SHALL be mutually
exclusive. The Parents multiselect SHALL list only non-kid users. Editing an existing user opens
the same modal pre-filled.

#### Scenario: Add new user
- **WHEN** the admin fills in name and password (non-kid) and submits
- **THEN** a new user is created, assigned an avatar color from the rotation sequence, and appears
  in the user list and on the pre-login screen

#### Scenario: Add a kid that cannot log in
- **WHEN** the admin enables the Kid toggle, leaves "Can log in" off, selects one or more parents,
  and submits without a password
- **THEN** a kid user is created with the selected managers, does not appear on the pre-login
  screen, and appears in the Family list for all users

#### Scenario: Add a kid that can log in
- **WHEN** the admin enables the Kid toggle, turns "Can log in" on, and submits with a password
- **THEN** a login-enabled kid is created and appears on the pre-login screen

#### Scenario: Kid and admin are mutually exclusive
- **WHEN** the admin attempts to enable both the Kid toggle and the Is Admin checkbox
- **THEN** the form prevents submission and the server rejects the combination with a validation
  error

#### Scenario: Only non-kids can be selected as parents
- **WHEN** the admin opens the Parents multiselect
- **THEN** only non-kid users are listed as selectable parents

#### Scenario: Edit user — change name only
- **WHEN** the admin edits a user, changes the name, and leaves the password blank
- **THEN** the user's name is updated and the existing password hash is retained

#### Scenario: Edit user — change password
- **WHEN** the admin edits a user and enters a new password
- **THEN** the new password is bcrypt-hashed and stored; the old password is invalidated

## ADDED Requirements

### Requirement: Manage a kid's parents
The admin panel SHALL allow an admin to view and change the set of parents (managers) assigned to a
kid at any time. Only non-kid users SHALL be assignable. Changes SHALL take effect immediately for
guardian access.

#### Scenario: Add a parent to an existing kid
- **WHEN** the admin adds a non-kid user to a kid's parents
- **THEN** that user immediately becomes a guardian and sees the kid's list with full claim data

#### Scenario: Remove a parent from an existing kid
- **WHEN** the admin removes a user from a kid's parents
- **THEN** that user immediately loses guardian access and thereafter sees the kid's list under the
  normal reveal rules

### Requirement: Upgrade a kid to a full user
The admin panel SHALL provide an action to upgrade a kid to a full (non-kid) user. Upgrading SHALL
clear the kid flag, remove all of that kid's parent relationships, and ensure the user can log in
with a password (prompting for one if the kid had no login credentials). The user's gifts and the
claims made on them SHALL be preserved.

#### Scenario: Upgrade a login-enabled kid
- **WHEN** the admin upgrades a kid who already has a password
- **THEN** the user becomes a full user with no parents, keeps all gifts and claims, and no
  additional password entry is required

#### Scenario: Upgrade a no-login kid requires a password
- **WHEN** the admin upgrades a kid that could not log in and had no password
- **THEN** the admin is required to set a password before the upgrade completes

#### Scenario: Parents lose access after upgrade
- **WHEN** a kid is upgraded to a full user
- **THEN** the former parents can only view that user's list under the normal reveal rules
