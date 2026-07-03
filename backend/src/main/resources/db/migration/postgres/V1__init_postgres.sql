-- PostgreSQL-specific initialization
-- This migration runs after the common V1__init.sql when using PostgreSQL

-- Add any PostgreSQL-specific columns or features here
-- For example, CREATED_AT with timezone awareness

-- Alter users table to use PostgreSQL-native TIMESTAMP WITH TIME ZONE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'created_at'
             AND data_type NOT LIKE '%time%zone%') THEN
    ALTER TABLE users
    ALTER COLUMN created_at SET DATA TYPE TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Alter gifts table to use PostgreSQL-native TIMESTAMP WITH TIME ZONE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'gifts' AND column_name = 'created_at'
             AND data_type NOT LIKE '%time%zone%') THEN
    ALTER TABLE gifts
    ALTER COLUMN created_at SET DATA TYPE TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE gifts
    ALTER COLUMN updated_at SET DATA TYPE TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Alter claims table to use PostgreSQL-native TIMESTAMP WITH TIME ZONE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'claims' AND column_name = 'created_at'
             AND data_type NOT LIKE '%time%zone%') THEN
    ALTER TABLE claims
    ALTER COLUMN created_at SET DATA TYPE TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE claims
    ALTER COLUMN updated_at SET DATA TYPE TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
