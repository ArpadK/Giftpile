-- PostgreSQL initialization script for Testcontainer
-- This script is executed once when the container starts

-- Create initial schema extensions if needed
CREATE EXTENSION IF NOT EXISTS plpgsql;

-- Set default timezone
SET timezone TO 'UTC';
