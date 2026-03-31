-- Search params cache: single-row table storing LLM-generated job search queries and locations.
-- Populated on first resume upload (bootstrap) and updated incrementally on each subsequent upload.
-- The daily pipeline reads from this table instead of using hardcoded query arrays.

CREATE TABLE IF NOT EXISTS search_params_cache (
  id integer PRIMARY KEY DEFAULT 1,
  roles text[] NOT NULL DEFAULT '{}',
  locations text[] NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Service role access only — not user-facing, no RLS needed
ALTER TABLE search_params_cache DISABLE ROW LEVEL SECURITY;
