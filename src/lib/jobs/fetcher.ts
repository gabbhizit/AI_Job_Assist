import { fetchJSearchJobs, type NormalizedJob } from "./jsearch-client";
import { fetchAdzunaJobs } from "./adzuna-client";
import { fetchSerpAPIJobs } from "./serpapi-client";
import { fetchTheMuseJobs } from "./themuse-client";
import { fetchRemoteOKJobs } from "./remoteok-client";
import { fetchJobicyJobs } from "./jobicy-client";
import { filterJob } from "./job-filter";
import { extractSkills } from "./skills-dictionary";
import { getSearchParams } from "./search-params";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SourceStats {
  fetched: number;
  errors: string[];
}

export interface FetchResult {
  fetched: number;
  filtered: number;
  stored: number;
  errors: string[];
  queriesUsed: string[];
  locationsUsed: string[];
  sources: {
    serpapi:  SourceStats;
    adzuna:   SourceStats;
    themuse:  SourceStats;
    jsearch:  SourceStats;
    remoteok: SourceStats;
    jobicy:   SourceStats;
  };
}

export async function fetchAndFilterJobs(
  supabase: SupabaseClient,
  overrideParams?: { queries: string[]; locations: string[] }
): Promise<FetchResult> {
  const result: FetchResult = {
    fetched: 0,
    filtered: 0,
    stored: 0,
    errors: [],
    queriesUsed: [],
    locationsUsed: [],
    sources: {
      serpapi:  { fetched: 0, errors: [] },
      adzuna:   { fetched: 0, errors: [] },
      themuse:  { fetched: 0, errors: [] },
      jsearch:  { fetched: 0, errors: [] },
      remoteok: { fetched: 0, errors: [] },
      jobicy:   { fetched: 0, errors: [] },
    },
  };
  const allJobs: NormalizedJob[] = [];

  const { queries, locations } = overrideParams ?? await getSearchParams(supabase);
  result.queriesUsed = queries;
  result.locationsUsed = locations;

  // ── Primary: SerpAPI Google Jobs ──────────────────────────────────────────
  if (process.env.SERPAPI_KEY) {
    for (const query of queries) {
      for (const location of locations) {
        try {
          const jobs = await fetchSerpAPIJobs(query, location);
          allJobs.push(...jobs);
          result.fetched += jobs.length;
          result.sources.serpapi.fetched += jobs.length;
        } catch (error) {
          const msg = `[${query}][${location}]: ${error instanceof Error ? error.message : "Unknown error"}`;
          result.sources.serpapi.errors.push(msg);
          result.errors.push(`SerpAPI ${msg}`);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  } else {
    result.sources.serpapi.errors.push("SERPAPI_KEY not configured");
    result.errors.push("SerpAPI skipped: SERPAPI_KEY not configured");
  }

  // ── Secondary: Adzuna ─────────────────────────────────────────────────────
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    const ADZUNA_PAGES = process.env.NODE_ENV === "production" ? 3 : 1;
    for (const query of queries) {
      for (let page = 1; page <= ADZUNA_PAGES; page++) {
        try {
          const jobs = await fetchAdzunaJobs(query, "US", page);
          allJobs.push(...jobs);
          result.fetched += jobs.length;
          result.sources.adzuna.fetched += jobs.length;
          if (jobs.length < 20) break; // sparse page means we've hit the end
        } catch (error) {
          const msg = `[${query}][page ${page}]: ${error instanceof Error ? error.message : "Unknown error"}`;
          result.sources.adzuna.errors.push(msg);
          result.errors.push(`Adzuna ${msg}`);
          break; // don't attempt further pages on error
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  } else {
    result.sources.adzuna.errors.push("ADZUNA_APP_ID / ADZUNA_APP_KEY not configured");
  }

  // ── Supplemental: The Muse ────────────────────────────────────────────────
  try {
    const museJobs = await fetchTheMuseJobs();
    allJobs.push(...museJobs);
    result.fetched += museJobs.length;
    result.sources.themuse.fetched += museJobs.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    result.sources.themuse.errors.push(msg);
    result.errors.push(`The Muse: ${msg}`);
  }

  // ── Fallback: JSearch (if RAPIDAPI_KEY is set) ────────────────────────────
  if (process.env.RAPIDAPI_KEY) {
    const JSEARCH_PAGES = process.env.NODE_ENV === "production" ? 2 : 1;
    for (const query of queries) {
      for (const location of locations) {
        for (let page = 1; page <= JSEARCH_PAGES; page++) {
          try {
            const jobs = await fetchJSearchJobs(query, location, page);
            allJobs.push(...jobs);
            result.fetched += jobs.length;
            result.sources.jsearch.fetched += jobs.length;
            if (jobs.length < 10) break; // sparse page — stop early
          } catch (error) {
            const msg = `[${query}][${location}][page ${page}]: ${error instanceof Error ? error.message : "Unknown error"}`;
            result.sources.jsearch.errors.push(msg);
            result.errors.push(`JSearch ${msg}`);
            break;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
  } else {
    result.sources.jsearch.errors.push("RAPIDAPI_KEY not configured (JSearch disabled)");
  }

  // ── Free: RemoteOK ────────────────────────────────────────────────────────
  try {
    const jobs = await fetchRemoteOKJobs();
    allJobs.push(...jobs);
    result.fetched += jobs.length;
    result.sources.remoteok.fetched += jobs.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    result.sources.remoteok.errors.push(msg);
    result.errors.push(`RemoteOK: ${msg}`);
  }

  // ── Free: Jobicy ──────────────────────────────────────────────────────────
  try {
    const jobs = await fetchJobicyJobs();
    allJobs.push(...jobs);
    result.fetched += jobs.length;
    result.sources.jobicy.fetched += jobs.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    result.sources.jobicy.errors.push(msg);
    result.errors.push(`Jobicy: ${msg}`);
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

  // ── Cross-source dedup (title+company key, first-seen wins) ──────────────
  const dedupSeen = new Set<string>();
  const dedupedJobs = allJobs.filter((job) => {
    const key =
      job.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() +
      "|" +
      job.company.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (dedupSeen.has(key)) return false;
    dedupSeen.add(key);
    return true;
  });

  // ── Filter and store ──────────────────────────────────────────────────────
  for (const job of dedupedJobs) {
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
