-- Migration 004: Gmail Integration
-- Adds Google OAuth token storage to profiles and creates email_events table

-- Token columns on profiles
-- These are ONLY read/written via service role client — never exposed to the browser
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_sync_cursor TEXT; -- Gmail historyId for incremental sync

-- Job email events table
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  snippet TEXT,
  received_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'unknown'
    CHECK (category IN (
      'application_confirmation',
      'interview_invite',
      'offer',
      'rejection',
      'recruiter_outreach',
      'unknown'
    )),
  job_match_id UUID REFERENCES public.job_matches(id) ON DELETE SET NULL,
  company_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, gmail_message_id)
);

-- RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own email_events"
  ON public.email_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own email_events"
  ON public.email_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS email_events_user_received
  ON public.email_events(user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS email_events_category
  ON public.email_events(user_id, category);
