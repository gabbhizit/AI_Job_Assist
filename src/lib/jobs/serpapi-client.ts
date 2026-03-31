import type { NormalizedJob } from "./jsearch-client";

interface SerpAPIJob {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    work_from_home?: boolean;
    salary?: string;
    qualifications?: string;
  };
  apply_options?: { title: string; link: string }[];
  share_link?: string;
}

interface SerpAPIResponse {
  jobs_results?: SerpAPIJob[];
  error?: string;
}

/**
 * Parse SerpAPI's human-readable salary string into min/max numbers.
 * Examples: "$120K–$180K a year", "$45–$55 an hour", "$100,000 a year"
 */
function parseSalary(salary?: string): { min: number | null; max: number | null } {
  if (!salary) return { min: null, max: null };

  const isHourly = /hour|hr/i.test(salary);
  const multiplier = isHourly ? 2080 : 1; // annualize hourly rates

  // Match patterns like $120K, $180,000, $45
  const numbers = salary.match(/\$?([\d,]+\.?\d*)\s*[Kk]?/g) || [];
  const parsed = numbers
    .map((n) => {
      const clean = n.replace(/[$,]/g, "");
      const val = parseFloat(clean);
      return clean.toLowerCase().endsWith("k") || /[Kk]/.test(n) ? val * 1000 : val;
    })
    .map((v) => v * multiplier)
    .filter((v) => v > 1000 && v < 10_000_000);

  if (parsed.length === 0) return { min: null, max: null };
  if (parsed.length === 1) return { min: parsed[0], max: null };
  return { min: Math.min(...parsed), max: Math.max(...parsed) };
}

/**
 * Parse SerpAPI's "3 days ago", "1 week ago", "just now" into ISO date string.
 */
function parsePostedAt(postedAt?: string): string | null {
  if (!postedAt) return null;

  const now = new Date();
  const lower = postedAt.toLowerCase();

  if (lower.includes("just") || lower.includes("today") || lower.includes("hour")) {
    return now.toISOString();
  }

  const dayMatch = lower.match(/(\d+)\s*day/);
  if (dayMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(dayMatch[1]));
    return d.toISOString();
  }

  const weekMatch = lower.match(/(\d+)\s*week/);
  if (weekMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(weekMatch[1]) * 7);
    return d.toISOString();
  }

  const monthMatch = lower.match(/(\d+)\s*month/);
  if (monthMatch) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - parseInt(monthMatch[1]));
    return d.toISOString();
  }

  return null;
}

/**
 * Infer experience level from title and description text.
 */
function inferExperience(title: string, description: string): string | null {
  const text = (title + " " + description).toLowerCase();

  if (/senior|sr\.|staff|principal|lead|architect/i.test(title)) return "senior";
  if (/junior|jr\.|entry.level|new.grad|graduate|intern/i.test(title)) return "entry";
  if (/\b(5|6|7|8|9|10)\+?\s*years?\b/i.test(text)) return "senior";
  if (/\b(3|4)\+?\s*years?\b/i.test(text)) return "mid";
  if (/\b(0|1|2)\+?\s*years?\b/i.test(text)) return "entry";

  return null;
}

const SERPAPI_PAGES = process.env.NODE_ENV === "production" ? 3 : 2;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchSerpAPIJobs(
  query: string,
  location: string
): Promise<NormalizedJob[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const allJobs: NormalizedJob[] = [];

  for (let page = 0; page < SERPAPI_PAGES; page++) {
    const params = new URLSearchParams({
      engine: "google_jobs",
      q: query,
      location,
      api_key: apiKey,
      num: "10",
      start: String(page * 10),
      chips: "date_posted:week", // only jobs from the last week
    });

    const response = await fetch(
      `https://serpapi.com/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data: SerpAPIResponse = await response.json();

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const jobs = data.jobs_results || [];
    allJobs.push(...jobs.map((job) => normalizeSerpAPIJob(job)));

    // Stop early if we got fewer results than requested (last page)
    if (jobs.length < 10) break;

    if (page < SERPAPI_PAGES - 1) await delay(300);
  }

  return allJobs;
}

function normalizeSerpAPIJob(job: SerpAPIJob): NormalizedJob {
  const salary = parseSalary(job.detected_extensions?.salary);

  // Combine description with highlights for richer text
  let description = job.description || "";
  if (job.job_highlights) {
    const parts: string[] = [];
    if (job.job_highlights.Qualifications?.length) {
      parts.push("Qualifications:\n" + job.job_highlights.Qualifications.join("\n"));
    }
    if (job.job_highlights.Responsibilities?.length) {
      parts.push("Responsibilities:\n" + job.job_highlights.Responsibilities.join("\n"));
    }
    if (parts.length > 0) {
      description = description + "\n\n" + parts.join("\n\n");
    }
  }

  return {
    external_id: job.job_id,
    source: "serpapi",
    title: job.title,
    company: job.company_name,
    location: job.location || null,
    is_remote: job.detected_extensions?.work_from_home ?? /remote/i.test(job.location),
    description,
    salary_min: salary.min,
    salary_max: salary.max,
    salary_currency: "USD",
    job_type: job.detected_extensions?.schedule_type ?? null,
    experience_level: inferExperience(job.title, description),
    application_url: job.apply_options?.[0]?.link ?? job.share_link ?? "",
    posted_at: parsePostedAt(job.detected_extensions?.posted_at),
    expires_at: null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
