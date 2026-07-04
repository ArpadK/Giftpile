## 1. Decide

- [ ] 1.1 Árpád: choose Flyway-managed schema OR explicit ddl-auto (delete dead migrations).

## 2. If Flyway (preferred for anything shared with family)

- [ ] 2.1 Add `org.flywaydb:flyway-database-sqlite` (version from Spring Boot BOM).
- [ ] 2.2 Rewrite `V1__init.sql` to portable SQL matching the current entities (users, gifts,
      claims incl. `updated_at`, indexes). Verify against a fresh SQLite AND Postgres database.
- [ ] 2.3 `application.properties`: `spring.flyway.enabled=true`,
      `spring.flyway.baseline-on-migrate=true`, `spring.jpa.hibernate.ddl-auto=validate`.
- [ ] 2.4 Boot against an existing ddl-auto-created `giftpile.db` to confirm the baseline path.
- [ ] 2.5 Update integration test properties (they already run Flyway against Postgres).
- [ ] 2.6 Update README/CLAUDE.md.

## 3. If ddl-auto

- [ ] 3.1 Delete `db/migration/**` and the flyway-core dependency; document in CLAUDE.md.
