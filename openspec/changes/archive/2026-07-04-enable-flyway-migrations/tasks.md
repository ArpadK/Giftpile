## 1. Decide

- [x] 1.1 Árpád: choose Flyway-managed schema OR explicit ddl-auto (delete dead migrations).
      → Chose Flyway.

## 2. If Flyway (preferred for anything shared with family)

- [x] 2.1 Add `org.flywaydb:flyway-database-sqlite` — not needed; SQLite support is built into
      `flyway-core` 12.x. `flyway-database-sqlite` is a paid Teams module not on Maven Central.
- [x] 2.2 Rewrite `V1__init.sql` to portable SQL matching the current entities (users, gifts,
      claims incl. `updated_at`, indexes). Uses `BIGINT PRIMARY KEY` (matches Hibernate Long ids,
      works as affinity alias in SQLite). Deleted the dead `postgres/V1__init_postgres.sql` overlay.
- [x] 2.3 `application.properties`: `spring.flyway.enabled=true`,
      `spring.flyway.baseline-on-migrate=true`, `spring.jpa.hibernate.ddl-auto=validate`.
- [x] 2.4 Boot against an existing ddl-auto-created `giftpile.db` to confirm the baseline path.
      Caught and fixed a type-name mismatch (INTEGER vs BIGINT) during validation.
- [x] 2.5 Update integration test properties — removed dead `classpath:db/migration/postgres`
      Flyway location.
- [x] 2.6 Update README/CLAUDE.md.

## 3. If ddl-auto

- [ ] 3.1 Delete `db/migration/**` and the flyway-core dependency; document in CLAUDE.md.
