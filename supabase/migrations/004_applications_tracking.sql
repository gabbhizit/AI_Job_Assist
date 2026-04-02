-- Migration 004: Applications tracking enhancements
-- Adds opt_end_date to profiles and a performance index for applications queries

-- OPT end date for countdown widget and profile completeness
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opt_end_date DATE;

-- Index to speed up applications page queries (filter by user + status)
CREATE INDEX IF NOT EXISTS job_matches_status_user_idx
  ON job_matches(user_id, user_status);
