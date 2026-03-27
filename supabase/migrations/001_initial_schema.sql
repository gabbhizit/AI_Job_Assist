-- ============================================
-- AI Job Copilot - Initial Database Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  visa_status TEXT NOT NULL DEFAULT 'f1_opt'
    CHECK (visa_status IN ('f1_opt', 'h1b', 'citizen', 'green_card', 'other')),
  plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'free', 'paid')),
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  jobs_viewed_today INT DEFAULT 0,
  jobs_viewed_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. USER PREFERENCES
-- ============================================
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_roles TEXT[] DEFAULT '{}',
  target_locations TEXT[] DEFAULT '{}',
  min_salary INT,
  experience_level TEXT DEFAULT 'entry'
    CHECK (experience_level IN ('entry', 'mid', 'senior')),
  remote_preference TEXT DEFAULT 'any'
    CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'any')),
  excluded_companies TEXT[] DEFAULT '{}',
  notify_email BOOLEAN DEFAULT TRUE,
  notify_frequency TEXT DEFAULT 'daily'
    CHECK (notify_frequency IN ('daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create preferences on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================
-- 3. RESUMES
-- ============================================
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL,
  parsed_data JSONB,
  raw_text TEXT,
  parsing_status TEXT DEFAULT 'pending'
    CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
  parsing_error TEXT,
  is_primary BOOLEAN DEFAULT TRUE,
  is_user_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own resumes"
  ON public.resumes FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_resumes_user_primary
  ON public.resumes(user_id, is_primary)
  WHERE is_primary = TRUE;

-- ============================================
-- 4. JOBS
-- ============================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  description TEXT,
  salary_min INT,
  salary_max INT,
  salary_currency TEXT DEFAULT 'USD',
  job_type TEXT,
  experience_level TEXT,
  skills_extracted TEXT[] DEFAULT '{}',
  application_url TEXT,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  quality_score INT DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(external_id, source)
);

CREATE INDEX idx_jobs_active ON public.jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_posted ON public.jobs(posted_at DESC);
CREATE INDEX idx_jobs_skills ON public.jobs USING GIN(skills_extracted);
CREATE INDEX idx_jobs_title_trgm ON public.jobs USING GIN(title gin_trgm_ops);
CREATE INDEX idx_jobs_company_trgm ON public.jobs USING GIN(company gin_trgm_ops);

-- Jobs are publicly readable (no user-specific data)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs are readable by authenticated users"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================
-- 5. JOB MATCHES
-- ============================================
CREATE TABLE public.job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  score_breakdown JSONB NOT NULL,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_notified BOOLEAN DEFAULT FALSE,
  user_status TEXT
    CHECK (user_status IN ('saved', 'dismissed', 'applied')),
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own matches"
  ON public.job_matches FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_matches_user_date ON public.job_matches(user_id, match_date DESC);
CREATE INDEX idx_matches_user_score ON public.job_matches(user_id, score DESC);

-- ============================================
-- 6. USER INTERACTIONS (append-only event log)
-- ============================================
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL
    CHECK (action IN ('view', 'save', 'unsave', 'dismiss', 'undismiss', 'apply', 'click_apply_link')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_interactions_user ON public.user_interactions(user_id, created_at DESC);

-- ============================================
-- 7. SPONSOR-FRIENDLY COMPANIES
-- ============================================
CREATE TABLE public.sponsor_friendly_companies (
  company_name TEXT PRIMARY KEY,
  source TEXT DEFAULT 'h1b_data_2024',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Readable by all authenticated users
ALTER TABLE public.sponsor_friendly_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors readable by authenticated"
  ON public.sponsor_friendly_companies FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================
-- 8. PIPELINE LOGS
-- ============================================
CREATE TABLE public.pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', FALSE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users read own resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "Users delete own resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- ============================================
-- 10. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
