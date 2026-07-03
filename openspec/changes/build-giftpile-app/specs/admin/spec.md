## ADDED Requirements

### Requirement: Admin role
The system SHALL support an `isAdmin` boolean flag on User. Admin users SHALL have access to the Admin panel. Non-admin users SHALL not see the Admin row on the Home screen and SHALL receive HTTP 403 on admin-only API endpoints.

#### Scenario: Admin sees Manage section on Home
- **WHEN** an admin user is authenticated and views the Home screen
- **THEN** a "Manage" section with a dashed-border "Admin" row (amber icon badge, shield icon) is visible below the Family section

#### Scenario: Non-admin cannot access admin panel
- **WHEN** a non-admin user attempts to navigate to the admin panel URL directly
- **THEN** the system redirects to Home and returns HTTP 403 on any admin API request

### Requirement: Admin panel — user list
The admin panel SHALL display one card per registered user showing: avatar, name, "Admin" label (amber, 700 weight, 11.5px) if applicable, an edit-pencil icon button, a delete (trash) icon button, and a full-width bordered "View / edit their list" button.

#### Scenario: Admin panel renders all users
- **WHEN** the admin navigates to the Admin panel
- **THEN** all registered users are shown, each with edit, delete, and "View / edit their list" controls

### Requirement: Add / edit family member
The admin panel SHALL provide a full-width "+ Add family member" pill button. Tapping it SHALL open a modal for adding a new user with fields: Name (required), Password (required for new, optional for edit — leave blank to keep current), Is Admin (checkbox). Editing an existing user opens the same modal pre-filled.

#### Scenario: Add new user
- **WHEN** the admin fills in name and password and submits
- **THEN** a new user is created, assigned an avatar color from the rotation sequence, and appears in the user list and on the pre-login screen

#### Scenario: Edit user — change name only
- **WHEN** the admin edits a user, changes the name, and leaves the password blank
- **THEN** the user's name is updated and the existing password hash is retained

#### Scenario: Edit user — change password
- **WHEN** the admin edits a user and enters a new password
- **THEN** the new password is bcrypt-hashed and stored; the old password is invalidated

### Requirement: Delete user — type-to-confirm
Deleting a user SHALL require the admin to type the user's exact name into a text input before the "Permanently delete" button enables. Deletion SHALL cascade: remove the user, all their gift ideas, and clear any claims they made on other users' gifts. Two guardrails SHALL be enforced:
1. Cannot delete the currently signed-in admin account.
2. Cannot delete the last remaining admin user.

#### Scenario: Delete button disabled until name typed
- **WHEN** the delete-user confirmation dialog is open and the input is empty or does not match the user's name exactly
- **THEN** the "Permanently delete" button is disabled (visually at 45% opacity) and does not respond to taps

#### Scenario: Delete button enables on exact name match
- **WHEN** the admin types the user's exact name into the confirmation input
- **THEN** the "Permanently delete" button becomes active

#### Scenario: Successful user deletion
- **WHEN** the admin confirms deletion
- **THEN** the user, their gifts, and their claims on others' gifts are removed; the user no longer appears anywhere in the app

#### Scenario: Cannot self-delete
- **WHEN** the signed-in admin tries to delete their own account
- **THEN** the system displays an inline error ("You cannot delete your own account") and does not delete

#### Scenario: Cannot delete last admin
- **WHEN** the admin attempts to delete the only remaining admin user
- **THEN** the system displays an inline error ("Cannot delete the last admin account") and does not delete

### Requirement: Admin-edit another user's list — medium-friction confirmation
Tapping "View / edit their list" SHALL open a Yes/Cancel confirmation dialog before navigating into the blind list editor for that user. The dialog SHALL clearly state the admin is about to view and edit someone else's list and that it could spoil a surprise. No typed confirmation is required.

#### Scenario: Admin confirms edit
- **WHEN** the admin taps "Yes" in the confirmation dialog
- **THEN** the system navigates to the list editor for that user in admin-edit mode, showing an amber info banner: "Admin mode — you're editing someone else's list. You can't see who will receive which gift."

#### Scenario: Admin cancels
- **WHEN** the admin taps "Cancel" in the confirmation dialog
- **THEN** no navigation occurs and the admin remains on the Admin panel
