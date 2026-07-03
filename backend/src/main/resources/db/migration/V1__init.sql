-- Common initialization schema (database-agnostic)
-- Works with H2, SQLite, and PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  link TEXT,
  price VARCHAR(255),
  description TEXT,
  exact_color BOOLEAN NOT NULL DEFAULT false,
  exact_product BOOLEAN NOT NULL DEFAULT false,
  only_once BOOLEAN NOT NULL DEFAULT true,
  manual_received BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  claimer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gift_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_gifts_owner_id ON gifts(owner_id);
CREATE INDEX IF NOT EXISTS idx_gifts_only_once ON gifts(only_once);
CREATE INDEX IF NOT EXISTS idx_claims_gift_id ON claims(gift_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer_user_id ON claims(claimer_user_id);
