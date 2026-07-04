-- Initial schema — compatible with SQLite and PostgreSQL.
--
-- Uses INTEGER PRIMARY KEY for ID columns. In SQLite, INTEGER PRIMARY KEY is an alias for the
-- 64-bit rowid, which enables auto-increment and is what Hibernate's GenerationType.IDENTITY
-- relies on via last_insert_rowid(). In PostgreSQL, INTEGER is a 32-bit int — sufficient for
-- a family-scale app. A future migration can widen to BIGINT on Postgres if ever needed.

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  name            VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
  color           VARCHAR(7)   NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
  id               INTEGER PRIMARY KEY,
  owner_id         INTEGER      NOT NULL REFERENCES users(id),
  title            VARCHAR(255) NOT NULL,
  link             TEXT,
  price            VARCHAR(255),
  description      TEXT,
  exact_color      BOOLEAN      NOT NULL DEFAULT FALSE,
  exact_product    BOOLEAN      NOT NULL DEFAULT FALSE,
  only_once        BOOLEAN      NOT NULL DEFAULT TRUE,
  manual_received  BOOLEAN      NOT NULL DEFAULT FALSE,
  priority         INTEGER      NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
  id               INTEGER PRIMARY KEY,
  gift_id          INTEGER  NOT NULL REFERENCES gifts(id)  ON DELETE CASCADE,
  claimer_user_id  INTEGER  NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  gift_date        DATE     NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gifts_owner_id         ON gifts(owner_id);
CREATE INDEX IF NOT EXISTS idx_gifts_only_once         ON gifts(only_once);
CREATE INDEX IF NOT EXISTS idx_claims_gift_id          ON claims(gift_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer_user_id  ON claims(claimer_user_id);
