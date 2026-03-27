import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { fetchSerpAPIJobs } from "@/lib/jobs/serpapi-client";
import { fetchTheMuseJobs } from "@/lib/jobs/themuse-client";
import { filterJob } from "@/lib/jobs/job-filter";
import { extractSkills } from "@/lib/jobs/skills-dictionary";
import { matchJobsForUser } from "@/lib/matching/scorer";
import type { ParsedResume } from "@/lib/supabase/types";

// Dev-only endpoint — returns 404 in production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated. Open this URL while logged into the dashboard." }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const result: Record<string, unknown> = {};

  // ── Step 1: Fetch a small batch of jobs ───────────────────────────────────
  const fetchStats = { fetched: 0, filtered: 0, stored: 0, errors: [] as string[] };
  const allJobs = [];

  // 1 SerpAPI query (uses ~1 of your 100 free monthly searches)
  if (process.env.SERPAPI_KEY) {
    try {
      const jobs = await fetchSerpAPIJobs("software engineer new grad", "United States");
      allJobs.push(...jobs);
      fetchStats.fetched += jobs.length;
    } catch (e) {
      fetchStats.errors.push(`SerpAPI: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  } else {
    fetchStats.errors.push("SerpAPI skipped: SERPAPI_KEY not set");
  }

  // The Muse — free, no quota cost
  try {
    const museJobs = await fetchTheMuseJobs();
    allJobs.push(...museJobs);
    fetchStats.fetched += museJobs.length;
  } catch (e) {
    fetchStats.errors.push(`The Muse: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // Filter and store
  for (const job of allJobs) {
    const filterResult = filterJob(job);
    if (!filterResult.pass) {
      fetchStats.filtered++;
      continue;
    }

    const skillsExtracted = job.description ? extractSkills(job.description) : [];

    const { error } = await serviceClient.from("jobs").upsert(
      {
        external_id: job.external_id,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        is_remote: job.is_remote,
        description: job.description,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        job_type: job.job_type,
        experience_level: job.experience_level,
        skills_extracted: skillsExtracted,
        application_url: job.application_url,
        posted_at: job.posted_at,
        expires_at: job.expires_at,
        is_active: true,
        quality_score: filterResult.score,
        raw_data: job.raw_data,
      },
      { onConflict: "external_id,source", ignoreDuplicates: false }
    );

    if (!error) fetchStats.stored++;
    else if (!error.message.includes("duplicate")) {
      fetchStats.errors.push(`DB: ${error.message}`);
    }
  }

  result.fetch = fetchStats;

  // ── Step 2: Match jobs for the current user ───────────────────────────────
  const matchStats = { matched: 0, error: null as string | null };

  const { data: resume } = await serviceClient
    .from("resumes")
    .select("parsed_data")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .eq("parsing_status", "completed")
    .single() as { data: { parsed_data: ParsedResume } | null };

  const { data: prefs } = await serviceClient
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!resume?.parsed_data) {
    matchStats.error = "No parsed resume found. Upload a resume first.";
  } else if (!prefs) {
    matchStats.error = "No preferences found.";
  } else {
    try {
      matchStats.matched = await matchJobsForUser(
        user.id,
        resume.parsed_data,
        prefs,
        serviceClient
      );
    } catch (e) {
      matchStats.error = e instanceof Error ? e.message : "Unknown error";
    }
  }

  result.match = matchStats;

  // ── Step 3: Sample of top matched jobs ───────────────────────────────────
  const { data: topMatches } = await serviceClient
    .from("job_matches")
    .select("score, score_breakdown, jobs(title, company, location, is_remote, salary_min, salary_max, source)")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(5) as {
      data: {
        score: number;
        score_breakdown: { explanation?: string };
        jobs: { title: string; company: string; location: string | null; is_remote: boolean; salary_min: number | null; salary_max: number | null; source: string };
      }[] | null
    };

  result.top_matches = (topMatches || []).map((m) => ({
    title: m.jobs?.title,
    company: m.jobs?.company,
    location: m.jobs?.is_remote ? "Remote" : m.jobs?.location,
    source: m.jobs?.source,
    salary: m.jobs?.salary_min ? `$${Math.round(m.jobs.salary_min / 1000)}K–$${Math.round((m.jobs.salary_max ?? m.jobs.salary_min) / 1000)}K` : null,
    score: m.score,
    explanation: m.score_breakdown?.explanation ?? null,
  }));

  return NextResponse.json(result, { status: 200 });
}
