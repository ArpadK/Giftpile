## Why

The schema is currently managed by Hibernate `ddl-auto=update`, which is fine for a hobby start
but risky long-term: it never removes/renames columns, can't express data migrations, and drifts
silently between SQLite and Postgres. Flyway is already on the classpath and a `V1__init.sql`
exists, but it is disabled — and its SQL (`SERIAL`) is Postgres-flavored, not SQLite-compatible.

**Decision needed from Árpád:** commit to Flyway-managed schema now (small migration-writing tax
on every schema change), or consciously stay on `ddl-auto=update` and delete the dead migration
files (KISS). Half-committed — migrations that exist but don't run — is the one clearly wrong
state, and it's the current one.

## What Changes

If we adopt Flyway:
- Add `flyway-database-sqlite` dependency; rewrite `V1__init.sql` to portable SQL that matches
  the *current* entity schema exactly (including `updated_at` columns).
- Enable Flyway + set `ddl-auto=validate` in `application.properties`.
- Add a baseline story for existing installs (`baseline-on-migrate=true`).
- Keep the Postgres-specific overlay only if genuinely needed; otherwise delete it.

If we stay on ddl-auto:
- Delete `db/migration/**` and the `flyway-core` dependency; document the choice in CLAUDE.md.

## Capabilities

### Modified Capabilities
- `database-schema`: schema lifecycle moves from Hibernate auto-DDL to versioned migrations
  (or is explicitly documented as auto-DDL).

## Impact

- `backend/pom.xml`, `application.properties`, `db/migration/**`
- Existing SQLite volumes need a one-time baseline when upgrading.
