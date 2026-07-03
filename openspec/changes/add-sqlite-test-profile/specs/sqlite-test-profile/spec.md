## ADDED Requirements

### Requirement: SQLite in-memory test database configuration
The system SHALL provide a Spring Boot test configuration that uses SQLite in-memory database for fast, isolated unit and integration testing. The configuration file `application-test.properties` SHALL define the datasource, Hibernate DDL strategy, and Flyway migration settings for SQLite.

#### Scenario: Default test run uses SQLite in-memory
- **WHEN** Maven command `mvn test` is executed without profiles
- **THEN** Spring Test activates the default profile and loads `application-test.properties`
- **AND** the datasource URL is `jdbc:sqlite::memory:`
- **AND** Flyway migrations execute from `src/main/resources/db/migration/`
- **AND** each test runs in isolation with a fresh in-memory database

#### Scenario: Flyway migrations apply to SQLite test database
- **WHEN** a test class with `@SpringBootTest` starts
- **THEN** Flyway applies all migration files compatible with SQLite
- **AND** the schema is initialized before test execution
- **AND** migrations support both ANSI SQL and SQLite-specific syntax

### Requirement: Maven integration profile for PostgreSQL Testcontainer tests
The system SHALL support a Maven profile `-Pintegration` that activates PostgreSQL Testcontainer tests. When this profile is active, Spring SHALL load `application-integrationtest.properties` which configures Testcontainers PostgreSQL and runs full integration tests.

#### Scenario: Integration test profile activates PostgreSQL Testcontainer
- **WHEN** Maven command `mvn test -Pintegration` is executed
- **THEN** the Maven profile "integration" is activated
- **AND** Spring Test profile "integrationtest" is activated via `@ActiveProfiles` or profile-specific pom.xml configuration
- **AND** Spring loads `application-integrationtest.properties`
- **AND** IntegrationTestBase creates a PostgreSQL Testcontainer
- **AND** all tests execute against the PostgreSQL container database

#### Scenario: Both test suites can run independently or in CI
- **WHEN** default `mvn test` executes
- **THEN** SQLite tests complete quickly (no container overhead)
- **AND** when `mvn test -Pintegration` executes in a separate CI job or stage
- **THEN** PostgreSQL Testcontainer tests provide full database compatibility verification
- **AND** both test suites can run in parallel without conflict

### Requirement: Flyway migration file compatibility
The system SHALL ensure Flyway migration files work with both SQLite and PostgreSQL. Migration files in `src/main/resources/db/migration/` SHALL use ANSI-standard SQL or syntax compatible with both databases. PostgreSQL-specific features SHALL be isolated in `src/main/resources/db/migration/postgres/` subdirectory.

#### Scenario: Base migrations apply to both SQLite and PostgreSQL
- **WHEN** Flyway runs against SQLite with profile "test"
- **THEN** it applies migrations from `db/migration/` successfully
- **AND** when Flyway runs against PostgreSQL with profile "integrationtest"
- **THEN** it applies the same migrations from `db/migration/` successfully
- **AND** the final schema is equivalent across both databases

#### Scenario: PostgreSQL-specific variations are in separate directory
- **WHEN** Flyway is configured with `spring.flyway.locations=classpath:db/migration,classpath:db/migration/postgres` for integrationtest profile
- **THEN** PostgreSQL-specific migrations in `db/migration/postgres/` are applied only to PostgreSQL
- **AND** SQLite tests skip the PostgreSQL-specific directory
