## ADDED Requirements

### Requirement: Maven dual test profiles (SQLite default, PostgreSQL integration)
The system SHALL support two Maven test execution profiles for the backend:
1. **Default** (no profile): Runs tests with SQLite in-memory database via `application-test.properties`
2. **Integration** (`-Pintegration`): Runs tests with PostgreSQL Testcontainer via `application-integrationtest.properties`

Both profiles SHALL execute the same test suite but against different databases to enable fast feedback (SQLite) and comprehensive verification (PostgreSQL).

#### Scenario: Default Maven test command uses SQLite
- **WHEN** developer or CI runs `mvn test` in `backend/` directory
- **THEN** Maven does not activate the "integration" profile
- **AND** Spring Boot Test profile "test" is active (default)
- **AND** `application-test.properties` is loaded
- **AND** all tests execute against SQLite in-memory database
- **AND** test execution completes quickly without container overhead

#### Scenario: Integration profile enables PostgreSQL Testcontainer
- **WHEN** developer or CI runs `mvn test -Pintegration` in `backend/` directory
- **THEN** Maven activates the "integration" profile
- **AND** Spring Boot Test profile "integrationtest" is active
- **AND** `application-integrationtest.properties` is loaded
- **AND** IntegrationTestBase and all test classes using it execute against PostgreSQL Testcontainer
- **AND** Flyway migrations run on the PostgreSQL container

#### Scenario: CI can run both test suites
- **WHEN** CI pipeline executes default test stage: `mvn test`
- **THEN** fast SQLite tests complete for quick feedback
- **AND** when CI pipeline executes integration stage (optional): `mvn test -Pintegration`
- **THEN** PostgreSQL tests provide full database compatibility verification
- **AND** both stages can run sequentially or in parallel jobs

### Requirement: POM configuration for profile-based test activation
The Maven pom.xml file SHALL define a profile named "integration" that sets Spring Boot Test profile to "integrationtest". This profile SHALL be inactive by default (not in active profiles list) and only activate when explicitly requested with `-Pintegration`.

#### Scenario: Integration profile is inactive by default
- **WHEN** pom.xml is parsed and no `-Pintegration` flag is provided
- **THEN** the "integration" profile does not activate
- **AND** Maven proceeds with default profile configuration
- **AND** Spring Test uses default profile (test)

#### Scenario: Integration profile activates Spring profile explicitly
- **WHEN** Maven command includes `-Pintegration`
- **THEN** the "integration" Maven profile activates
- **AND** it configures Spring Boot with `-Dspring.profiles.active=integrationtest` (via surefire plugin or pom configuration)
- **AND** Spring Test loads `application-integrationtest.properties`
- **AND** Testcontainers are started for the test session
