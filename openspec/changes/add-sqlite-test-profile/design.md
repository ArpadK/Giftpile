## Context

The backend currently has:
- `application-test.properties` configured for H2 in-memory database (used by default tests)
- `application-integrationtest.properties` configured for PostgreSQL Testcontainer with Flyway enabled
- `IntegrationTestBase` class that extends `@SpringBootTest` with Testcontainers setup

The requirement is to shift the default test profile to use SQLite (matching production DB) while keeping Testcontainers PostgreSQL available via Maven profile `-Pintegration`. This provides:
1. **Default tests (SQLite)**: Fast CI runs, matches production database, no container overhead
2. **Integration tests (PostgreSQL)**: Full database compatibility verification against production-like environment

## Goals / Non-Goals

**Goals:**
- Configure SQLite as the default test database (application-test.properties)
- Add Maven profile `-Pintegration` to run Testcontainers PostgreSQL tests
- Ensure both test suites run against consistent schema (Flyway migrations)
- Default `mvn test` uses SQLite; `mvn test -Pintegration` uses PostgreSQL Testcontainer
- No breaking changes to existing test code; use Spring's profile activation mechanism

**Non-Goals:**
- Migrate existing test classes or change test logic
- Add new test classes (that's implementation)
- Modify application.properties (production config stays unchanged)
- Remove Testcontainers or PostgreSQL testing capability

## Decisions

### Decision 1: Use SQLite in-memory (jdbc:sqlite::memory:) for default tests
**Rationale**: SQLite matches production database, eliminates container startup overhead (~5-10s per test run), provides instant feedback. In-memory mode (:memory:) ensures test isolation and cleanup.

**Alternatives considered**:
- H2 in-memory: Smaller footprint but doesn't match production DB (H2 has SQL dialect differences)
- File-based SQLite: Adds cleanup complexity; in-memory is faster and cleaner

### Decision 2: Maven profiles for conditional Flyway/datasource configuration
**Rationale**: Spring Test's `@ActiveProfiles` annotation allows different `application-<profile>.properties` files to load. Two profiles:
- Default (no profile): Uses `application-test.properties` (SQLite, Flyway enabled)
- `-Pintegration`: Uses `application-integrationtest.properties` (PostgreSQL, Flyway enabled)

**Alternatives considered**:
- Maven failsafe vs surefire: Adds complexity; profile-based is simpler for CI
- Environment variables: Fragile in CI; properties files are declarative and versioned

### Decision 3: Keep existing IntegrationTestBase for PostgreSQL tests
**Rationale**: Already functional with Testcontainers setup. Tests extending `IntegrationTestBase` will use `@ActiveProfiles("integrationtest")` which loads PostgreSQL config. Non-integration tests use default profile (SQLite).

**Alternatives considered**:
- Create new base class for SQLite tests: Unnecessary duplication; Spring's profile mechanism handles it

### Decision 4: Flyway enabled for both profiles
**Rationale**: Ensures schema consistency across SQLite and PostgreSQL. Migrations in `src/main/resources/db/migration/` apply to both; PostgreSQL-specific variations in `postgres/` subdir handled by `spring.flyway.locations`.

**Alternatives considered**:
- Hibernate DDL for SQLite: Less reliable; Flyway gives explicit control and matches production

## Risks / Trade-offs

**[Risk] SQLite SQL dialect differences**
- Mitigation: Ensure migration files in `db/migration/` use only ANSI SQL or SQLite-compatible syntax. PostgreSQL-specific features stay in `postgres/` subdir with `spring.flyway.locations` profile-specific configuration.

**[Risk] Test failures in SQLite don't catch PostgreSQL-specific bugs**
- Mitigation: CI runs both suites; default tests catch regressions fast, integration tests run in parallel or as separate job. Development workflow runs `mvn test -Pintegration` before commit for confidence.

**[Risk] Flyway baseline/history table compatibility**
- Mitigation: Ensure `flyway-core` and `flyway-database-sqlite` versions are compatible. Both profiles use same Flyway version from parent BOM. Baseline handled by `spring.flyway.baseline-on-migrate=true` in both configs.

**[Trade-off] Slower CI for integration tests**
- Justification: Worth it for catch PostgreSQL-specific issues. Fast SQLite tests provide quick feedback; integration tests can run in parallel CI job if needed.

## Migration Plan

1. **Add `application-test.properties`** with SQLite in-memory JDBC URL and Flyway enabled
2. **Update `pom.xml`** with `-Pintegration` profile that sets Spring profile to "integrationtest"
3. **Update `application-integrationtest.properties`** if needed (verify Flyway locations are correct)
4. **Verify Flyway migrations**: Check `src/main/resources/db/migration/` for SQLite compatibility
5. **Test execution**:
   - `mvn test` → Runs all tests with SQLite (application-test.properties)
   - `mvn test -Pintegration` → Runs all tests with PostgreSQL Testcontainer (application-integrationtest.properties)
6. **CI configuration**: Default `mvn test` runs SQLite; add separate job or conditional for `-Pintegration` if needed

## Open Questions

- Should integration tests run in CI by default or only on demand? (Answer: Make `-Pintegration` opt-in; CI job manually invokes if needed)
- Do existing migration files work with SQLite without modification? (Answer: Verify in tasks; create SQLite-specific versions if needed)
