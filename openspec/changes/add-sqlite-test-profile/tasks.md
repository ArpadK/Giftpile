## 1. Configure SQLite Test Properties

- [ ] 1.1 Create `backend/src/test/resources/application-test.properties` with SQLite in-memory configuration
- [ ] 1.2 Set datasource URL to `jdbc:sqlite::memory:`
- [ ] 1.3 Configure Hibernate `spring.jpa.hibernate.ddl-auto=create-drop` for isolated tests
- [ ] 1.4 Enable Flyway with `spring.flyway.enabled=true`
- [ ] 1.5 Set Flyway locations to `classpath:db/migration` (SQLite-compatible migrations only)

## 2. Configure Integration Test Properties

- [ ] 2.1 Update `backend/src/test/resources/application-integrationtest.properties` to ensure PostgreSQL Flyway locations include both `classpath:db/migration,classpath:db/migration/postgres`
- [ ] 2.2 Verify Flyway configuration for PostgreSQL Testcontainer compatibility

## 3. Update Maven POM Configuration

- [ ] 3.1 Add Maven profile `<profile><id>integration</id>` to `backend/pom.xml`
- [ ] 3.2 Configure surefire plugin within integration profile to set `spring.profiles.active=integrationtest`
- [ ] 3.3 Ensure default (no profile) uses default Spring profile activation
- [ ] 3.4 Verify dependencies: ensure `flyway-core`, `flyway-database-sqlite`, and Testcontainers are declared with correct versions

## 4. Verify Flyway Migration Compatibility

- [ ] 4.1 Audit `backend/src/main/resources/db/migration/V1__init.sql` for SQLite compatibility
- [ ] 4.2 Audit `backend/src/main/resources/db/migration/postgres/V1__init_postgres.sql` for PostgreSQL-specific features
- [ ] 4.3 Create SQLite-specific migration versions if ANSI SQL conflicts exist
- [ ] 4.4 Test migration application: `mvn clean test` should run Flyway against SQLite

## 5. Verify Test Execution

- [ ] 5.1 Run `mvn clean test` in `backend/` directory and confirm all tests pass with SQLite
- [ ] 5.2 Verify in test logs that `application-test.properties` is loaded (datasource URL contains `:memory:`)
- [ ] 5.3 Run `mvn clean test -Pintegration` and confirm all tests pass with PostgreSQL Testcontainer
- [ ] 5.4 Verify in test logs that `application-integrationtest.properties` is loaded (datasource URL contains PostgreSQL)
- [ ] 5.5 Confirm Flyway runs and migrations execute in both profiles

## 6. Documentation and Cleanup

- [ ] 6.1 Update `backend/CLAUDE.md` or root `CLAUDE.md` with test execution commands
- [ ] 6.2 Document: "Default: `mvn test` (SQLite), Full integration: `mvn test -Pintegration` (PostgreSQL)"
- [ ] 6.3 Remove or archive `application-test.properties` if it currently uses H2 (preserve history in git)
- [ ] 6.4 Verify no other test resources or configs conflict with new profile setup
