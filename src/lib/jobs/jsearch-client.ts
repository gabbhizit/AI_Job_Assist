interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string | null;
  job_state: string | null;
  job_country: string | null;
  job_description: string;
  job_apply_link: string;
  job_is_remote: boolean;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_employment_type: string | null;
  job_required_experience: {
    no_experience_required: boolean;
    required_experience_in_months: number | null;
    experience_mentioned: boolean;
  } | null;
  job_posted_at_timestamp: number | null;
  job_offer_expiration_timestamp: number | null;
}

export interface NormalizedJob {
  external_id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_type: string | null;
  experience_level: string | null;
  application_url: string;
  posted_at: string | null;
  expires_at: string | null;
  raw_data: Record<string, unknown>;
  // Populated by fetcher via sponsor_friendly_companies lookup
  is_h1b_sponsor?: boolean;
  is_everified?: boolean;
}

const RAPIDAPI_HOST = "jsearch.p.rapidapi.com";

export async function fetchJSearchJobs(
  query: string,
  location: string,
  page: number = 1
): Promise<NormalizedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const params = new URLSearchParams({
    query: `${query} in ${location}`,
    page: String(page),
    num_pages: "1",
    date_posted: "month",
    country: "us",
  });

  const response = await fetch(
    `https://${RAPIDAPI_HOST}/search?${params.toString()}`,
    {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const jobs: JSearchJob[] = data.data || [];

  return jobs.map((job) => normalizeJSearchJob(job));
}

function normalizeJSearchJob(job: JSearchJob): NormalizedJob {
  const location = [job.job_city, job.job_state]
    .filter(Boolean)
    .join(", ") || null;

  let experienceLevel: string | null = null;
  if (job.job_required_experience) {
    const months = job.job_required_experience.required_experience_in_months;
    if (months === null || months === 0 || job.job_required_experience.no_experience_required) {
      experienceLevel = "entry";
    } else if (months <= 36) {
      experienceLevel = "entry";
    } else if (months <= 72) {
      experienceLevel = "mid";
    } else {
      experienceLevel = "senior";
    }
  }

  return {
    external_id: job.job_id,
    source: "jsearch",
    title: job.job_title,
    company: job.employer_name,
    location,
    is_remote: job.job_is_remote,
    description: job.job_description,
    salary_min: job.job_min_salary,
    salary_max: job.job_max_salary,
    salary_currency: job.job_salary_currency || "USD",
    job_type: job.job_employment_type,
    experience_level: experienceLevel,
    application_url: job.job_apply_link,
    posted_at: job.job_posted_at_timestamp
      ? new Date(job.job_posted_at_timestamp * 1000).toISOString()
      : null,
    expires_at: job.job_offer_expiration_timestamp
      ? new Date(job.job_offer_expiration_timestamp * 1000).toISOString()
      : null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
