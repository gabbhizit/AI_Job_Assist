# AI Job Copilot — Project Context for Claude

## What This Is
A SaaS MVP for MS CS students on F1/OPT visas in the US. Core value: daily personalized job matches based on resume + preferences, with a focus on companies known to sponsor H1B visas.

**Target users:** 10–50 MS CS students, newly launched
**Solo developer**, 3–4 week build timeline
**Stack:** Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage) + Claude API + Vercel

---

## Tech Stack Decisions

| Decision | Why |
|----------|-----|
| Next.js App Router | Latest, Vercel-native, server components |
| Supabase | Auth + DB + Storage in one, generous free tier |
| Claude Haiku (`claude-haiku-4-5-20251001`) | Resume parsing (~$0.001/resume) + search param generation from resumes |
| Vercel Cron | No extra infra — daily job pipeline runs as a cron job hitting `/api/cron/daily-pipeline` |
| Rule-based matching (not LLM) | Zero cost, fast, explainable scores, good enough for MVP |
| shadcn/ui + Tailwind v4 | Uses `@base-ui/react` — NOT Radix, so `asChild` prop doesn't exist on Button |
| Supabase clients are untyped | Supabase v2.100.0 TypeScript inference breaks with manually-written DB types → removed `<Database>` generic from all clients to avoid `.update()/.insert()` resolving to `never` |
| Chrome Extension — plain JS/MV3 | No build step. Supabase UMD bundle vendored in `lib/`. Uses `chrome.identity.launchWebAuthFlow` for OAuth (implicit flow, not PKCE). Talks directly to Supabase REST — does NOT call Next.js API routes. |

---

## Key Architecture

### Job Pipeline (daily cron at 6AM UTC)
```
/api/cron/daily-pipeline (protected by CRON_SECRET bearer token)
  Step 1: fetchAndFilterJobs()
            → reads dynamic queries/locations from search_params_cache (Claude-generated),
              merged with hardcoded defaults (cache-first, deduped)
            → fetches from SerpAPI + Adzuna + The Muse (+ JSearch if configured)
            → returns FetchResult { fetched, filtered, stored, errors,
                queriesUsed, locationsUsed, sources{serpapi,adzuna,themuse,jsearch} }
  Step 2: matchJobsForUser() → scores every active job against each user's resume
  Step 3: email notifications (TODO — Resend not wired yet)
  Step 4: cleanupStaleJobs() (Sundays only)
```

### Search Params Cache
Job search queries and locations are Claude-generated from user resumes, not hardcoded.

```
search_params_cache table (single row, id=1): roles text[], locations text[], generated_at

getSearchParams(supabase):
  1. Read search_params_cache row
  2. If empty → auto-bootstrap: query all primary resumes → Claude Haiku generates list
  3. Merge cache roles/locations with DEFAULT_QUERIES/DEFAULT_LOCATIONS (cache-first, deduped)
  4. Apply env cap: dev = 3 queries × 1 location, prod = 15 queries × 8 locations
  5. Return { queries, locations }

generateSearchParamsCache(supabase, newParsedResume?):
  Bootstrap mode (no cache or no resume arg):
    → query all is_primary+completed resumes → build compact summaries → Claude generates list
  Incremental mode (cache exists + new resume provided):
    → Claude merges new resume into existing list, dedupes, normalizes
    → compute diff: addedRoles = new roles not in old cache
    → upsert cache, return { addedRoles, allRoles, allLocations }
```

### Resume Upload → Immediate Pipeline Trigger
After resume is parsed and stored as `parsing_status: "completed"`, upload route fires a background job (fire-and-forget, does not block response):
```
createServiceRoleClient()
  → generateSearchParamsCache(serviceClient, parsedResume)   ← update cache
  → runDeltaFetchAndMatch(serviceClient, userId, addedRoles, allLocations, parsedResume)
      if addedRoles.length > 0:
        fetchAndFilterJobs(supabase, { queries: addedRoles, locations: allLocations })
      always:
        matchJobsForUser(userId, parsedResume, prefs, supabase)  ← immediate matches
```
This gives users job matches right after upload without waiting for the next daily cron.

### Job Sources (priority order)
1. **SerpAPI Google Jobs** — primary, aggregates 1000+ boards. Needs `SERPAPI_KEY`. Free: 100 searches/month, paid: $50/month for 5K.
   - Pagination via `next_page_token` (NOT numeric `start=` offset — causes 400 on google_jobs engine)
   - Dev: 2 pages/query, Prod: 3 pages/query
2. **Adzuna** — free secondary. Needs `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`.
3. **The Muse** — free supplemental, tech-curated. No key needed. Optional `THE_MUSE_API_KEY` for higher limits.
4. **JSearch (RapidAPI)** — optional fallback, only runs if `RAPIDAPI_KEY` is set. Deprioritized due to data quality.

### Matching Score (0–100, minimum 40 to show)
| Component | Points |
|-----------|--------|
| Title match | 25 |
| Skills overlap | 35 |
| Location | 15 |
| Experience level | 10 |
| Recency | 10 |
| H1B sponsor boost | 5 |

"Why matched" explanation is template-based — no LLM cost.

### Resume Parsing Pipeline
```
PDF upload → pdf-parse text extraction → Claude Haiku AI parse → rule-based validation
→ confidence: high/medium/low + flags → user can edit parsed data in UI
→ (background) generateSearchParamsCache + runDeltaFetchAndMatch
```

### Interaction Tracking (dual system, no conflict)
- `job_matches.user_status` — current state for UI (saved/dismissed/applied/null). Updated in place.
- `user_interactions` — append-only event log for analytics. Never used for UI state.

### Dev Test Pipeline
`GET /api/test/pipeline` — dev-only (returns 404 in prod). Requires auth (must be logged in).
Returns structured `steps[]` via `createPipelineLog()` with timing per step:
- `search_params` — shows cache state (roles/locations or "fallback_defaults")
- `fetch` — per-source breakdown (fetched/errors for serpapi/adzuna/themuse/jsearch) + queriesUsed/locationsUsed
- `match` — matches created for current user
- `top_matches` — top 5 scored jobs with explanation

---

## File Map

```
src/
  app/
    page.tsx                          — root landing page (minimal)
    login/page.tsx                    — Google OAuth login
    dashboard/
      layout.tsx                      — sidebar + header layout
      page.tsx                        — top 15 matched jobs
      jobs/saved/page.tsx             — saved jobs
      resume/page.tsx                 — upload + editable parsed resume
      preferences/page.tsx            — target roles, locations, salary, etc.
    api/
      auth/callback/route.ts          — Google OAuth callback
      auth/signout/route.ts           — sign out
      profile/route.ts                — GET/PUT user profile
      preferences/route.ts            — GET/PUT preferences
      resume/route.ts                 — GET/PUT parsed resume
      resume/upload/route.ts          — 3-stage PDF parsing + fires delta pipeline
      jobs/route.ts                   — GET top 15 matches
      jobs/saved/route.ts             — GET saved jobs
      jobs/[id]/action/route.ts       — POST save/dismiss/apply/click
      cron/daily-pipeline/route.ts    — daily fetch + match + notify + cleanup
      test/pipeline/route.ts          — DEV ONLY: structured pipeline test (createPipelineLog)
  components/
    layout/sidebar.tsx, header.tsx
    jobs/job-card.tsx
    resume/upload-form.tsx, parsed-editor.tsx, confidence-banner.tsx
    ui/                               — shadcn components (button, card, badge, input, etc.)
  lib/
    supabase/
      client.ts                       — browser Supabase client (no <Database> generic)
      server.ts                       — server + service role clients (no <Database> generic)
      middleware.ts                   — auth redirect logic
      types.ts                        — Database interface + domain types (ParsedResume, etc.)
    ai/
      ai-provider.ts                  — AIProvider interface + getAIProvider() factory
      claude-provider.ts              — Claude Haiku implementation
      resume-validator.ts             — post-parse validation, confidence scoring
      prompts/resume-parse.ts         — detailed Claude prompt for structured resume extraction
    jobs/
      fetcher.ts                      — orchestrates all job sources + DB upsert
                                        accepts optional overrideParams{queries,locations}
                                        returns FetchResult with per-source breakdown
      serpapi-client.ts               — SerpAPI Google Jobs → NormalizedJob
                                        pagination via next_page_token (NOT start= offset)
      adzuna-client.ts                — Adzuna → NormalizedJob
      themuse-client.ts               — The Muse → NormalizedJob
      jsearch-client.ts               — JSearch (fallback) + NormalizedJob interface definition
      job-filter.ts                   — hard reject + quality scoring (threshold: 30)
      skills-dictionary.ts            — ~150 canonical skills + aliases, word-boundary regex
      search-params.ts                — Claude-generated search param cache (bootstrap + incremental)
                                        getSearchParams(), generateSearchParamsCache()
      delta-pipeline.ts               — targeted fetch + match triggered on resume upload
                                        runDeltaFetchAndMatch()
    matching/
      scorer.ts                       — full scoring algorithm + matchJobsForUser()
    utils/
      pdf-parser.ts                   — thin pdf-parse wrapper
      pipeline-logger.ts              — structured step logger (createPipelineLog)
  middleware.ts                       — Next.js route protection (redirects)
  types/
    pdf-parse.d.ts                    — type declaration for pdf-parse package
supabase/
  migrations/001_initial_schema.sql   — full DB schema with RLS, indexes, triggers
  migrations/002_job_filter_fields.sql — adds is_h1b_sponsor + is_everified to jobs
  migrations/003_search_params_cache.sql — search_params_cache table (single-row, no RLS)
  seed/sponsor-companies.sql          — ~100 known H1B sponsor companies
chrome-extension/                     — Chrome MV3 extension (plain JS, no build step)
  manifest.json                       — MV3 config: permissions, content_scripts, host_permissions
  config.js                           — public Supabase URL + anon key (safe to bundle)
  background/service-worker.js        — auth (launchWebAuthFlow), token refresh, Supabase queries
  popup/popup.{html,js,css}           — minimal popup: auth status + connect/disconnect
  content/autofill-core.js            — shared field registry, fill engine, floating button, toast
  content/linkedin.js                 — MutationObserver for LinkedIn Easy Apply modal
  content/greenhouse.js               — Greenhouse application form autofill
  content/lever.js                    — Lever application form autofill
  lib/supabase-min.js                 — vendored Supabase UMD build (exposes window.supabase)
```

---

## Database Tables
- `profiles` — user info, visa status, plan (trial/paid)
- `user_preferences` — target roles, locations, salary, experience, remote, notifications
- `resumes` — PDF file path, parsed JSONB, parsing status/confidence, is_user_verified
- `jobs` — normalized job data, skills_extracted TEXT[], quality_score, is_h1b_sponsor, is_everified
- `job_matches` — per-user scored matches with score_breakdown JSONB, user_status, explanation
- `user_interactions` — append-only event log (save/unsave/dismiss/apply/click)
- `sponsor_friendly_companies` — ~100 known H1B sponsors (seeded), is_everified flag
- `pipeline_logs` — cron run history
- `search_params_cache` — single row (id=1, enforced by CHECK constraint): roles text[], locations text[], generated_at. No RLS. Updated on resume upload, read by pipeline.

All tables except `search_params_cache` have RLS enabled. Storage bucket `resumes` has user-scoped RLS.

---

## Known Issues & Workarounds

### Supabase TypeScript Types → `never`
**Problem:** Supabase JS client v2.100.0 with manually-written `Database` types causes `.update()/.insert()/.upsert()` parameter types to resolve to `never`.
**Fix Applied:** Removed `<Database>` generic from all Supabase client constructors and function signatures. All clients are now untyped (`SupabaseClient` without generic). `as { data: ... }` assertions used locally where type narrowing is needed.
**Impact:** No runtime effect. Query results type as `any` — add explicit type annotations when needed.

### pdf-parse Missing Types
`src/types/pdf-parse.d.ts` — manual type declaration added since `@types/pdf-parse` doesn't exist.

### Button `asChild` Not Supported
shadcn Button uses `@base-ui/react/button`, not Radix. The `asChild` prop doesn't exist. Use styled `<span>` inside `<label>` for file input triggers.

### SerpAPI Pagination
`engine=google_jobs` does NOT support numeric `start=` offset pagination (causes 400). Use `next_page_token` from `serpapi_pagination` in the response. Implemented in `serpapi-client.ts`.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # never expose in frontend

# Claude
ANTHROPIC_API_KEY=
AI_PROVIDER=claude

# Job APIs
SERPAPI_KEY=                     # primary — sign up at serpapi.com
THE_MUSE_API_KEY=                # optional — higher rate limits
ADZUNA_APP_ID=                   # secondary — developer.adzuna.com
ADZUNA_APP_KEY=
RAPIDAPI_KEY=                    # optional fallback only

# Email
RESEND_API_KEY=                  # email notifications (not wired yet)
ADMIN_EMAIL=                     # pipeline failure alerts

# Cron
CRON_SECRET=                     # protects /api/cron/daily-pipeline

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Running Locally

```bash
npm run dev          # start dev server on port 3000
npm run build        # verify TypeScript compiles (run before pushing)
```

**Apply DB migrations (run in order in Supabase SQL Editor if not applied):**
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_job_filter_fields.sql`
3. `supabase/migrations/003_search_params_cache.sql`

**Load the Chrome Extension:**
1. Open `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" → select `chrome-extension/` folder
3. Note extension ID shown (needed for Supabase redirect URL)
4. In Supabase Dashboard → Auth → URL Config → add `https://*.chromiumapp.org/oauth` to Allowed Redirect URLs
5. Click extension icon → "Connect Account" → Google OAuth → done

**Manually trigger the pipeline:**
```bash
curl -X GET "http://localhost:3000/api/cron/daily-pipeline" \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d '=' -f2)"
```

**Test pipeline (dev only — must be logged in):**
```
GET http://localhost:3000/api/test/pipeline
```
Returns structured steps[] with timing, per-source fetch breakdown, search_params cache state, and top 5 matched jobs.

**Check DB:**
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked "SELECT COUNT(*) FROM jobs"
```

---

## Current State (as of April 2026)

### ✅ Built & Working
- Google OAuth login (Supabase)
- Dashboard with job matches display + FilterBar (role, date, type, level, H1B, E-Verified filters)
- Resume upload → Claude parse → editable review UI
- Preferences form
- Saved jobs page
- Job matching engine (rule-based scoring)
- Daily cron pipeline structure
- SerpAPI + Adzuna + The Muse + JSearch (fallback) job sources
- SerpAPI token-based pagination (next_page_token, 2 pages dev / 3 pages prod)
- Dynamic search params from user resumes — Claude-generated cache, auto-bootstrapped, incremental updates on upload
- Delta fetch + match on resume upload — immediate job matches without waiting for cron
- Structured pipeline logging — per-source breakdown, queries/locations used, timing per step
- H1B Sponsor (blue badge) + E-Verified (emerald badge) on job cards
- sponsor_friendly_companies seed table
- Full DB schema with RLS + 3 migrations applied
- Chrome Extension (MV3) — autofill for LinkedIn Easy Apply, Greenhouse, Lever
- Dev test pipeline endpoint (`/api/test/pipeline`)

### 🚧 Remaining
- [ ] Resend email integration — daily digest + pipeline failure alerts
- [ ] Trial/paid plan logic (1-week free trial gate)
- [ ] Stripe Checkout — subscription billing
- [ ] Landing page at `/` — currently minimal placeholder
- [ ] Mobile responsiveness polish
- [ ] Production deployment to Vercel
- [ ] End-to-end cron testing with real SerpAPI data

### 🔮 Future / Deferred
- Resume tailoring (premium feature using Claude Sonnet)
- pgvector semantic search
- LinkedIn profile import
- Feedback-based match weight adjustment
- OCR for image-based PDFs
- B2B Consultancy feature — `consultancy_id` column already in `profiles` as prep
- Chrome Extension Phase 2: Workday support, Chrome Web Store publish
