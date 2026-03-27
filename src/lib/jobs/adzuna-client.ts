import type { NormalizedJob } from "./jsearch-client";

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  redirect_url: string;
  salary_min: number | null;
  salary_max: number | null;
  contract_time: string | null;
  created: string;
  category: { tag: string; label: string };
}

export async function fetchAdzunaJobs(
  query: string,
  location: string,
  page: number = 1
): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("ADZUNA_APP_ID or ADZUNA_APP_KEY is not configured");
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    results_per_page: "20",
    content_type: "application/json",
    sort_by: "date",
    max_days_old: "30",
    category: "it-jobs",
  });

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/us/search/${page}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const jobs: AdzunaJob[] = data.results || [];

  return jobs.map((job) => normalizeAdzunaJob(job));
}

function normalizeAdzunaJob(job: AdzunaJob): NormalizedJob {
  const isRemote =
    job.title.toLowerCase().includes("remote") ||
    job.location.display_name.toLowerCase().includes("remote");

  return {
    external_id: String(job.id),
    source: "adzuna",
    title: job.title,
    company: job.company.display_name,
    location: job.location.display_name || null,
    is_remote: isRemote,
    description: job.description,
    salary_min: job.salary_min ? Math.round(job.salary_min) : null,
    salary_max: job.salary_max ? Math.round(job.salary_max) : null,
    salary_currency: "USD",
    job_type: job.contract_time || null,
    experience_level: null,
    application_url: job.redirect_url,
    posted_at: job.created || null,
    expires_at: null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
