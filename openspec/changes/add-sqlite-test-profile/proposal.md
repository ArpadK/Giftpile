## Why

CI pipelines need fast, lightweight test execution without container orchestration overhead. While Testcontainers PostgreSQL provides comprehensive integration testing, SQLite in-memory databases offer instant startup and are ideal for the default test suite in CI environments where speed is critical. This dual-profile strategy enables both fast feedback loops (default) and thorough integration verification (-Pintegration).

## What Changes

- Create `application-test.properties` configured for SQLite in-memory (jdbc:sqlite::memory:)
- Add Maven profile `-Pintegration` that activates the existing `application-integrationtest.properties` (PostgreSQL Testcontainer)
- Update `pom.xml` to define two test execution profiles with different property activation
- Ensure Flyway migrations work with both SQLite and PostgreSQL
- Default `mvn test` runs against SQLite; `mvn test -Pintegration` runs against Testcontainers PostgreSQL

## Capabilities

### New Capabilities
- `sqlite-test-profile`: SQLite in-memory test configuration with Flyway migration support for CI speed and simplicity

### Modified Capabilities
- `test-execution`: Maven now supports dual test profiles (fast SQLite default, full integration via -Pintegration flag)

## Impact

- **Backend testing**: `backend/` Maven build gains profile-based test execution strategy
- **CI/CD**: Default test runs use SQLite (fast); integration tests opt-in via Maven flag
- **Dependencies**: Adds Flyway SQLite support (if not already present); leverages existing sqlite-jdbc and Testcontainers
- **Migration files**: Ensure `src/main/resources/db/migration/` contains SQLite-compatible SQL; PostgreSQL-specific migrations in `postgres/` subdirectory remain for integration tests
