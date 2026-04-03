import type { NormalizedJob } from "./jsearch-client";

interface MuseJob {
  id: number;
  name: string;
  company: { name: string };
  locations: { name: string }[];
  levels: { name: string; short_name: string }[];
  categories: { name: string }[];
  contents: string; // HTML
  refs: { landing_page: string };
  publication_date: string;
}

interface MuseResponse {
  results: MuseJob[];
  total: number;
  page_count: number;
}

/**
 * Strip HTML tags from Muse job content, leaving plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Map Muse level names to our experience_level values.
 */
function mapMuseLevel(levelName?: string): string | null {
  if (!levelName) return null;
  const lower = levelName.toLowerCase();
  if (lower.includes("entry") || lower.includes("junior") || lower.includes("internship")) {
    return "entry";
  }
  if (lower.includes("mid") || lower.includes("senior")) {
    return lower.includes("senior") ? "senior" : "mid";
  }
  if (lower.includes("management") || lower.includes("director") || lower.includes("vp")) {
    return "senior";
  }
  return null;
}

// Tech-focused categories to fetch from The Muse
const MUSE_CATEGORIES = [
  "Software Engineer",
  "Data Science",
  "DevOps / SysAdmin",
  "Machine Learning",
  "Data and Analytics",
  "Product Management",
  "IT",
  "QA",
  "Computer and IT",
];

const MUSE_PAGES = process.env.NODE_ENV === "production" ? 3 : 1;

export async function fetchTheMuseJobs(): Promise<NormalizedJob[]> {
  const apiKey = process.env.THE_MUSE_API_KEY;
  const allJobs: NormalizedJob[] = [];

  for (const category of MUSE_CATEGORIES) {
    try {
      const jobs = await fetchMuseCategory(category, apiKey);
      allJobs.push(...jobs);
    } catch (error) {
      // Log but don't throw — Muse is supplemental
      console.error(
        `The Muse [${category}] error:`,
        error instanceof Error ? error.message : error
      );
    }
    // Small delay between category requests
    await new Promise((r) => setTimeout(r, 300));
  }

  return allJobs;
}

async function fetchMuseCategory(
  category: string,
  apiKey?: string
): Promise<NormalizedJob[]> {
  const allJobs: NormalizedJob[] = [];

  for (let page = 1; page <= MUSE_PAGES; page++) {
    const params = new URLSearchParams({
      category,
      location: "United States",
      page: String(page),
      ...(apiKey ? { api_key: apiKey } : {}),
    });

    const response = await fetch(
      `https://www.themuse.com/api/public/jobs?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`The Muse API error: ${response.status} ${response.statusText}`);
    }

    const data: MuseResponse = await response.json();
    const results = data.results || [];
    allJobs.push(...results.map((job) => normalizeMuseJob(job)));

    // Stop if we've reached the last page
    if (page >= data.page_count || results.length === 0) break;

    await new Promise((r) => setTimeout(r, 300));
  }

  return allJobs;
}

function normalizeMuseJob(job: MuseJob): NormalizedJob {
  const locationName = job.locations?.[0]?.name ?? null;
  const isRemote =
    !locationName ||
    /remote|anywhere|flexible/i.test(locationName);

  return {
    external_id: `muse_${job.id}`,
    source: "themuse",
    title: job.name,
    company: job.company.name,
    location: locationName,
    is_remote: isRemote,
    description: stripHtml(job.contents),
    salary_min: null, // Muse doesn't provide salary
    salary_max: null,
    salary_currency: "USD",
    job_type: null,
    experience_level: mapMuseLevel(job.levels?.[0]?.name),
    application_url: job.refs?.landing_page ?? "",
    posted_at: job.publication_date
      ? new Date(job.publication_date).toISOString()
      : null,
    expires_at: null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
