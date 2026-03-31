import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAndFilterJobs } from "@/lib/jobs/fetcher";
import { matchJobsForUser } from "@/lib/matching/scorer";
import { createPipelineLog } from "@/lib/utils/pipeline-logger";
import type { ParsedResume } from "@/lib/supabase/types";

// Dev-only endpoint — returns 404 in production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated. Open this URL while logged into the dashboard." },
      { status: 401 }
    );
  }

  const serviceClient = await createServiceRoleClient();
  const log = createPipelineLog();

  // ── Step 0: Search params cache ───────────────────────────────────────────
  log.step("search_params");
  try {
    const { data: cache } = await serviceClient
      .from("search_params_cache")
      .select("roles, locations, generated_at")
      .eq("id", 1)
      .single();

    if (cache) {
      log.success("search_params", {
        roles: cache.roles as string[],
        locations: cache.locations as string[],
        generated_at: cache.generated_at as string,
        source: "cache",
      });
    } else {
      log.success("search_params", {
        roles: null,
        locations: null,
        source: "fallback_defaults",
        note: "No cache found — pipeline will use hardcoded defaults",
      });
    }
  } catch (e) {
    log.error("search_params", e);
  }

  // ── Step 1: Fetch jobs (reuses full pipeline + search params cache) ───────
  log.step("fetch");
  try {
    const fetchResult = await fetchAndFilterJobs(serviceClient);
    log.success("fetch", {
      fetched:        fetchResult.fetched,
      filtered:       fetchResult.filtered,
      stored:         fetchResult.stored,
      queries_used:   fetchResult.queriesUsed,
      locations_used: fetchResult.locationsUsed,
      sources: {
        serpapi: {
          fetched: fetchResult.sources.serpapi.fetched,
          errors:  fetchResult.sources.serpapi.errors,
        },
        adzuna: {
          fetched: fetchResult.sources.adzuna.fetched,
          errors:  fetchResult.sources.adzuna.errors,
        },
        themuse: {
          fetched: fetchResult.sources.themuse.fetched,
          errors:  fetchResult.sources.themuse.errors,
        },
        jsearch: {
          fetched: fetchResult.sources.jsearch.fetched,
          errors:  fetchResult.sources.jsearch.errors,
        },
      },
    });
  } catch (e) {
    log.error("fetch", e);
  }

  // ── Step 2: Match jobs for the current user ───────────────────────────────
  log.step("match");
  try {
    const { data: resume } = (await serviceClient
      .from("resumes")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .eq("parsing_status", "completed")
      .single()) as { data: { parsed_data: ParsedResume } | null };

    const { data: prefs } = await serviceClient
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!resume?.parsed_data) {
      log.error("match", "No parsed resume found. Upload a resume first.");
    } else if (!prefs) {
      log.error("match", "No preferences found. Fill in preferences first.");
    } else {
      const matchCount = await matchJobsForUser(
        user.id,
        resume.parsed_data,
        prefs,
        serviceClient
      );
      log.success("match", {
        user_id:         user.id,
        matches_created: matchCount,
      });
    }
  } catch (e) {
    log.error("match", e);
  }

  // ── Step 3: Top 5 matched jobs snapshot ──────────────────────────────────
  log.step("top_matches");
  try {
    const { data: topMatches } = (await serviceClient
      .from("job_matches")
      .select(
        "score, score_breakdown, jobs(title, company, location, is_remote, salary_min, salary_max, source)"
      )
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(5)) as {
      data: {
        score: number;
        score_breakdown: { explanation?: string };
        jobs: {
          title: string;
          company: string;
          location: string | null;
          is_remote: boolean;
          salary_min: number | null;
          salary_max: number | null;
          source: string;
        };
      }[] | null;
    };

    log.success("top_matches", {
      count: topMatches?.length ?? 0,
      jobs: (topMatches ?? []).map((m) => ({
        title:       m.jobs?.title,
        company:     m.jobs?.company,
        location:    m.jobs?.is_remote ? "Remote" : m.jobs?.location,
        salary:
          m.jobs?.salary_min
            ? `$${Math.round(m.jobs.salary_min / 1000)}K–$${Math.round(
                (m.jobs.salary_max ?? m.jobs.salary_min) / 1000
              )}K`
            : null,
        score:       m.score,
        source:      m.jobs?.source,
        explanation: m.score_breakdown?.explanation ?? null,
      })),
    });
  } catch (e) {
    log.error("top_matches", e);
  }

  const summary = log.summary();
  return NextResponse.json(
    {
      status:      log.hasErrors() ? "completed_with_errors" : "success",
      total_steps: summary.totalSteps,
      error_count: summary.errors,
      steps:       summary.steps,
    },
    { status: 200 }
  );
}
