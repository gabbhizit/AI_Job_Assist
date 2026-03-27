import { fetchJSearchJobs, type NormalizedJob } from "./jsearch-client";
import { fetchAdzunaJobs } from "./adzuna-client";
import { fetchSerpAPIJobs } from "./serpapi-client";
import { fetchTheMuseJobs } from "./themuse-client";
import { filterJob } from "./job-filter";
import { extractSkills } from "./skills-dictionary";
import type { SupabaseClient } from "@supabase/supabase-js";

// SerpAPI: primary source — Google Jobs aggregates 1000+ boards (Indeed, LinkedIn, etc.)
// Dev: 3 queries × 1 location = 3 SerpAPI calls
// Prod: 8 queries × 4 locations = 32 SerpAPI calls
const SERP_QUERIES =
  process.env.NODE_ENV === "production"
    ? [
        "software engineer",
        "backend developer",
        "frontend developer",
        "data engineer",
        "ML engineer",
        "devops engineer",
        "software developer",
        "new grad software engineer",
      ]
    : ["software engineer", "new grad software engineer", "ML engineer"];

const SERP_LOCATIONS =
  process.env.NODE_ENV === "production"
    ? ["United States", "San Francisco, CA", "New York, NY", "Seattle, WA"]
    : ["United States"];

// JSearch: fallback source — only runs if RAPIDAPI_KEY is set
const JSEARCH_QUERIES =
  process.env.NODE_ENV === "production"
    ? ["software engineer", "backend developer", "data engineer", "new grad software"]
    : ["software engineer"];

const JSEARCH_LOCATIONS =
  process.env.NODE_ENV === "production"
    ? ["United States", "San Francisco, CA"]
    : ["United States"];

interface FetchResult {
  fetched: number;
  filtered: number;
  stored: number;
  errors: string[];
}

export async function fetchAndFilterJobs(
  supabase: SupabaseClient
): Promise<FetchResult> {
  const result: FetchResult = { fetched: 0, filtered: 0, stored: 0, errors: [] };
  const allJobs: NormalizedJob[] = [];

  // ── Primary: SerpAPI Google Jobs ──────────────────────────────────────────
  if (process.env.SERPAPI_KEY) {
    for (const query of SERP_QUERIES) {
      for (const location of SERP_LOCATIONS) {
        try {
          const jobs = await fetchSerpAPIJobs(query, location);
          allJobs.push(...jobs);
          result.fetched += jobs.length;
        } catch (error) {
          result.errors.push(
            `SerpAPI [${query}][${location}]: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  } else {
    result.errors.push("SerpAPI skipped: SERPAPI_KEY not configured");
  }

  // ── Secondary: Adzuna ─────────────────────────────────────────────────────
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    const adzunaQueries =
      process.env.NODE_ENV === "production"
        ? SERP_QUERIES
        : ["software engineer", "data engineer"];

    for (const query of adzunaQueries) {
      try {
        const jobs = await fetchAdzunaJobs(query, "US");
        allJobs.push(...jobs);
        result.fetched += jobs.length;
      } catch (error) {
        result.errors.push(
          `Adzuna [${query}]: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // ── Supplemental: The Muse ────────────────────────────────────────────────
  try {
    const museJobs = await fetchTheMuseJobs();
    allJobs.push(...museJobs);
    result.fetched += museJobs.length;
  } catch (error) {
    result.errors.push(
      `The Muse: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // ── Fallback: JSearch (if RAPIDAPI_KEY is set) ────────────────────────────
  if (process.env.RAPIDAPI_KEY) {
    for (const query of JSEARCH_QUERIES) {
      for (const location of JSEARCH_LOCATIONS) {
        try {
          const jobs = await fetchJSearchJobs(query, location);
          allJobs.push(...jobs);
          result.fetched += jobs.length;
        } catch (error) {
          result.errors.push(
            `JSearch [${query}][${location}]: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  // ── Filter and store ──────────────────────────────────────────────────────
  for (const job of allJobs) {
    const filterResult = filterJob(job);
    if (!filterResult.pass) {
      result.filtered++;
      continue;
    }

    // Extract skills from JD
    const skillsExtracted = job.description ? extractSkills(job.description) : [];

    // Upsert into database
    const { error } = await supabase.from("jobs").upsert(
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
      {
        onConflict: "external_id,source",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      // Likely a duplicate from cross-source — not a real error
      if (!error.message.includes("duplicate")) {
        result.errors.push(`DB insert: ${error.message}`);
      }
    } else {
      result.stored++;
    }
  }

  return result;
}

export async function cleanupStaleJobs(supabase: SupabaseClient): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .eq("is_active", true)
    .or(
      `expires_at.lt.${new Date().toISOString()},posted_at.lt.${thirtyDaysAgo.toISOString()}`
    )
    .select("id");

  return data?.length ?? 0;
}
