-- Add H1B sponsor and E-Verified flags to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_h1b_sponsor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_everified    BOOLEAN NOT NULL DEFAULT FALSE;

-- Add E-Verified flag to sponsor companies table
ALTER TABLE sponsor_friendly_companies
  ADD COLUMN IF NOT EXISTS is_everified BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes for fast filter queries
CREATE INDEX IF NOT EXISTS idx_jobs_h1b_sponsor ON jobs(is_h1b_sponsor);
CREATE INDEX IF NOT EXISTS idx_jobs_everified    ON jobs(is_everified);
