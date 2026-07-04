-- V2 set the column default to 'gift' (lowercase), but Hibernate's @Enumerated(EnumType.STRING)
-- stores and reads the exact enum name: GIFT / EXPERIENCE (uppercase).
-- UPPER() is a no-op for values already written correctly by the app, so this is safe to run
-- on any database regardless of how many gifts were added after the initial deployment.
UPDATE gifts SET type = UPPER(type);
