-- Kid users: child accounts curated by assigned parents (managers).
-- Defaults keep every existing user a normal, login-capable, non-kid — no data change.
ALTER TABLE users ADD COLUMN is_kid    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN can_login BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS kid_managers (
  kid_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (kid_user_id, manager_user_id)
);

CREATE INDEX IF NOT EXISTS idx_kid_managers_manager_user_id ON kid_managers(manager_user_id);
