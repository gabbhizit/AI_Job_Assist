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
| Claude Haiku 4.5 | Cheapest capable model for resume parsing (~$0.001/resume) |
| Vercel Cron | No extra infra — daily job pipeline runs as a cron job hitting `/api/cron/daily-pipeline` |
| Rule-based matching (not LLM) | Zero cost, fast, explainable scores, good enough for MVP |
| shadcn/ui + Tailwind v4 | Uses `@base-ui/react` — NOT Radix, so `asChild` prop doesn't exist on Button |
| Supabase clients are untyped | Supabase v2.100.0 TypeScript inference breaks with manually-written DB types → removed `<Database>` generic from all clients to avoid `.update()/.insert()` resolving to `never` |

---

## Key Architecture

### Job Pipeline (daily cron at 6AM UTC)
```
/api/cron/daily-pipeline (protected by CRON_SECRET bearer token)
  Step 1: fetchAndFilterJobs() → fetches from SerpAPI + Adzuna + The Muse (+ JSearch if configured)
  Step 2: matchJobsForUser() → scores every active job against each user's resume
  Step 3: email notifications (TODO — Resend not wired yet)
  Step 4: cleanupStaleJobs() (Sundays only)
```

### Job Sources (priority order)
1. **SerpAPI Google Jobs** — primary, aggregates 1000+ boards. Needs `SERPAPI_KEY`. Free: 100 searches/month, paid: $50/month for 5K.
2. **Adzuna** — free secondary. Needs `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`.
3. **The Muse** — free supplemental, tech-curated. No key needed. Optional `THE_MUSE_API_KEY` for higher limits.
4. **JSearch (RapidAPI)** — optional fallback, only runs if `RAPIDAPI_KEY` is set. Deprioritized due to data quality.

Dev mode: 3 SerpAPI queries × 1 location = 3 API calls
Prod mode: 8 SerpAPI queries × 4 locations = 32 API calls

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
```

### Interaction Tracking (dual system, no conflict)
- `job_matches.user_status` — current state for UI (saved/dismissed/applied/null). Updated in place.
- `user_interactions` — append-only event log for analytics. Never used for UI state.

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
      resume/upload/route.ts          — 3-stage PDF parsing pipeline
      jobs/route.ts                   — GET top 15 matches
      jobs/saved/route.ts             — GET saved jobs
      jobs/[id]/action/route.ts       — POST save/dismiss/apply/click
      cron/daily-pipeline/route.ts    — daily fetch + match + notify + cleanup
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
      serpapi-client.ts               — SerpAPI Google Jobs → NormalizedJob
      adzuna-client.ts                — Adzuna → NormalizedJob
      themuse-client.ts               — The Muse → NormalizedJob
      jsearch-client.ts               — JSearch (fallback) + NormalizedJob interface definition
      job-filter.ts                   — hard reject + quality scoring (threshold: 30)
      skills-dictionary.ts            — ~150 canonical skills + aliases, word-boundary regex
    matching/
      scorer.ts                       — full scoring algorithm + matchJobsForUser()
    utils/
      pdf-parser.ts                   — thin pdf-parse wrapper
      pipeline-logger.ts              — structured step logger for cron
  middleware.ts                       — Next.js route protection (redirects)
  types/
    pdf-parse.d.ts                    — type declaration for pdf-parse package
supabase/
  migrations/001_initial_schema.sql   — full DB schema with RLS, indexes, triggers
  seed/sponsor-companies.sql          — ~100 known H1B sponsor companies
```

---

## Database Tables
- `profiles` — user info, visa status, plan (trial/paid)
- `user_preferences` — target roles, locations, salary, experience, remote, notifications
- `resumes` — PDF file path, parsed JSONB, parsing status/confidence, is_user_verified
- `jobs` — normalized job data, skills_extracted TEXT[], quality_score
- `job_matches` — per-user scored matches with score_breakdown JSONB, user_status, explanation
- `user_interactions` — append-only event log (save/unsave/dismiss/apply/click)
- `sponsor_friendly_companies` — ~100 known H1B sponsors (seeded)
- `pipeline_logs` — cron run history

All tables have RLS enabled. Storage bucket `resumes` has user-scoped RLS.

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

**Manually trigger the pipeline:**
```bash
curl -X GET "http://localhost:3000/api/cron/daily-pipeline" \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d '=' -f2)"
```

**Check DB:**
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked "SELECT COUNT(*) FROM jobs"
```

---

## Current State (as of March 2026)

### ✅ Built & Working
- Google OAuth login (Supabase)
- Dashboard with job matches display
- Resume upload → Claude parse → editable review UI
- Preferences form
- Saved jobs page
- Job matching engine (rule-based scoring)
- Daily cron pipeline structure
- SerpAPI + Adzuna + The Muse + JSearch (fallback) job sources
- sponsor_friendly_companies seed table
- Full DB schema with RLS

### 🚧 Remaining (Weeks 3–4)
- [ ] Resend email integration — daily digest + pipeline failure alerts
- [ ] Trial/paid plan logic (1-week free trial gate)
- [ ] Stripe Checkout — subscription billing
- [ ] Landing page at `/`
- [ ] Mobile responsiveness polish
- [ ] Production deployment to Vercel
- [ ] End-to-end cron testing with real data

### 🔮 Future / Deferred
- Resume tailoring (premium feature using Claude Sonnet)
- pgvector semantic search
- LinkedIn profile import
- Feedback-based match weight adjustment
- OCR for image-based PDFs
