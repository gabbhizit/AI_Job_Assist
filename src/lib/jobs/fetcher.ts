import { fetchJSearchJobs, type NormalizedJob } from "./jsearch-client";
import { fetchAdzunaJobs } from "./adzuna-client";
import { fetchSerpAPIJobs } from "./serpapi-client";
import { fetchTheMuseJobs } from "./themuse-client";
import { filterJob } from "./job-filter";
import { extractSkills } from "./skills-dictionary";
import { getSearchParams } from "./search-params";
import type { SupabaseClient } from "@supabase/supabase-js";

interface FetchResult {
  fetched: number;
  filtered: number;
  stored: number;
  errors: string[];
}

export async function fetchAndFilterJobs(
  supabase: SupabaseClient,
  overrideParams?: { queries: string[]; locations: string[] }
): Promise<FetchResult> {
  const result: FetchResult = { fetched: 0, filtered: 0, stored: 0, errors: [] };
  const allJobs: NormalizedJob[] = [];

  const { queries, locations } = overrideParams ?? await getSearchParams(supabase);

  // ── Primary: SerpAPI Google Jobs ──────────────────────────────────────────
  if (process.env.SERPAPI_KEY) {
    for (const query of queries) {
      for (const location of locations) {
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
    for (const query of queries) {
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
    for (const query of queries) {
      for (const location of locations) {
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

  // ── Build sponsor + E-Verify lookup map ──────────────────────────────────
  const sponsorMap = new Map<string, { is_h1b_sponsor: boolean; is_everified: boolean }>();
  const { data: sponsorRows } = await supabase
    .from("sponsor_friendly_companies")
    .select("company_name, is_everified");
  if (sponsorRows) {
    for (const row of sponsorRows) {
      sponsorMap.set(row.company_name.toLowerCase(), {
        is_h1b_sponsor: true,
        is_everified: row.is_everified ?? false,
      });
    }
  }

  // ── Filter and store ──────────────────────────────────────────────────────
  for (const job of allJobs) {
    const filterResult = filterJob(job);
    if (!filterResult.pass) {
      result.filtered++;
      continue;
    }

    // Resolve H1B sponsor + E-Verify flags via company name lookup
    const companyKey = job.company.toLowerCase().trim();
    // Try exact match first, then partial match for common variations (e.g. "Google LLC" → "google")
    let sponsorInfo = sponsorMap.get(companyKey);
    if (!sponsorInfo) {
      for (const [key, info] of sponsorMap) {
        if (companyKey.includes(key) || key.includes(companyKey)) {
          sponsorInfo = info;
          break;
        }
      }
    }
    const is_h1b_sponsor = sponsorInfo?.is_h1b_sponsor ?? false;
    const is_everified = sponsorInfo?.is_everified ?? false;

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
        is_h1b_sponsor,
        is_everified,
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
