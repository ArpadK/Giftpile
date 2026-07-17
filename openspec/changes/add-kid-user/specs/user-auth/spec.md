## MODIFIED Requirements

### Requirement: User list on pre-login screen
The system SHALL display all users who can log in as tappable rows on the pre-login screen without
requiring the visitor to type a username. Kid users whose "Can log in" is off SHALL be excluded
from the pre-login list. Each row SHALL show a 44px circular avatar (user's initial letter, bold
white, on the user's accent color), the user's name (700 weight, 15.5px), and a trailing
chevron-right icon.

#### Scenario: Pre-login screen loads
- **WHEN** a visitor navigates to the app root while not authenticated
- **THEN** the system displays a centered column with the Giftpile logo, a "Who's this?" subhead,
  and one tappable row per user who can log in

#### Scenario: No-login kid is hidden from the picker
- **WHEN** a kid user with "Can log in" off exists and a visitor loads the pre-login screen
- **THEN** that kid is not shown as a selectable row, even though the kid appears in the Family list
  for authenticated users

#### Scenario: Login-enabled kid appears in the picker
- **WHEN** a kid user with "Can log in" on exists and a visitor loads the pre-login screen
- **THEN** that kid is shown as a selectable row like any other user

#### Scenario: No users registered
- **WHEN** the system has no registered users
- **THEN** the pre-login screen shows no user rows (admin must seed first user via backend config or
  a first-run setup flow)

## ADDED Requirements

### Requirement: Login-enabled kid authenticates as an ordinary user
A kid user whose "Can log in" is on SHALL authenticate through the same two-step login flow as any
other user, and once authenticated SHALL have the identical experience of an ordinary user —
including viewing their own list under blind context. A kid user whose "Can log in" is off SHALL
never be able to establish a session.

#### Scenario: Login-enabled kid signs in
- **WHEN** a login-enabled kid selects themselves and submits the correct password
- **THEN** a session is created and the kid reaches the Home screen with the ordinary user
  experience

#### Scenario: No-login kid cannot authenticate
- **WHEN** an authentication attempt is made for a kid whose "Can log in" is off
- **THEN** the system refuses to create a session
