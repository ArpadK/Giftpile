-- Add gift type: 'gift' (physical gift) or 'experience' (activity, outing, etc.)
-- Defaults to 'gift' so existing rows are valid.
ALTER TABLE gifts ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'gift';
