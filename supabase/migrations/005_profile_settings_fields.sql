-- Migration 005: Add opt_end_date to profiles and min_match_score to user_preferences

-- opt_end_date may have been added in 004_applications_tracking; use IF NOT EXISTS to be safe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opt_end_date DATE;

-- min_match_score: the minimum job match % a user wants to see (default 40, stored as integer 0-100)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS min_match_score INT DEFAULT 40
  CHECK (min_match_score >= 0 AND min_match_score <= 100);
