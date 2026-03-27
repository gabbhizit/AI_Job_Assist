-- ============================================
-- Add consultancy_id to profiles
-- Minimal schema prep for future B2B feature
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consultancy_id UUID DEFAULT NULL;
