## ADDED Requirements

### Requirement: User list on pre-login screen
The system SHALL display all registered users as tappable rows on the pre-login screen without requiring the visitor to type a username. Each row SHALL show a 44px circular avatar (user's initial letter, bold white, on the user's accent color), the user's name (700 weight, 15.5px), and a trailing chevron-right icon.

#### Scenario: Pre-login screen loads
- **WHEN** a visitor navigates to the app root while not authenticated
- **THEN** the system displays a centered column with the Giftpile logo, a "Who's this?" subhead, and one tappable row per registered user

#### Scenario: No users registered
- **WHEN** the system has no registered users
- **THEN** the pre-login screen shows no user rows (admin must seed first user via backend config or a first-run setup flow)

### Requirement: Two-step login (user select → password)
The system SHALL implement login as a two-step flow: the visitor first selects a user from the list, then enters that user's password on a separate step. No step SHALL require typing a username.

#### Scenario: User selects themselves
- **WHEN** a visitor taps a user row
- **THEN** the system navigates to the password step showing that user's avatar, "Hi, {name}" heading, and a password input

#### Scenario: Wrong password entered
- **WHEN** the visitor submits an incorrect password
- **THEN** the system displays inline error text on the password step and does not create a session

#### Scenario: Correct password entered
- **WHEN** the visitor submits the correct password
- **THEN** the system creates a server-side session, sets a session cookie, and navigates to the Home screen

#### Scenario: "Not {name}?" back link
- **WHEN** the visitor taps the back link on the password step
- **THEN** the system returns to the user-select screen with no session created

### Requirement: Server-side session management
The system SHALL manage authentication via server-side sessions (HttpSession). Passwords SHALL be stored as bcrypt hashes. Plaintext passwords SHALL never be stored or logged.

#### Scenario: Session persists across page reloads
- **WHEN** an authenticated user reloads the page
- **THEN** the system restores the session and shows the Home screen without re-prompting for a password

#### Scenario: Unauthenticated API access
- **WHEN** an unauthenticated request is made to any protected API endpoint
- **THEN** the system returns HTTP 401

### Requirement: Logout
The system SHALL provide a logout action available from the Home screen only. Logout SHALL invalidate the server-side session immediately.

#### Scenario: User logs out
- **WHEN** an authenticated user taps the logout icon on the Home screen
- **THEN** the system invalidates the session, clears the session cookie, and redirects to the pre-login screen
