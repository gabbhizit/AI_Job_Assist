import type { NormalizedJob } from "./jsearch-client";

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  jobIndustry: string[];
  jobType: string[];
  jobGeo: string;
  jobLevel: string;
  jobExcerpt: string;
  jobDescription: string; // HTML
  pubDate: string; // ISO timestamp
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
}

interface JobicyResponse {
  apiVersion: string;
  documentationUrl: string;
  friendlyNotice: string;
  jobCount: number;
  jobs: JobicyJob[];
}

function mapJobicyLevel(level: string): string | null {
  const lower = level.toLowerCase();
  if (lower.includes("junior") || lower.includes("entry") || lower.includes("intern")) return "entry";
  if (lower.includes("mid") || lower.includes("midweight")) return "mid";
  if (lower.includes("senior") || lower.includes("director") || lower.includes("lead")) return "senior";
  return null;
}

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

export async function fetchJobicyJobs(): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({
    count: "50",
    industry: "tech",
  });

  const response = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Jobicy API error: ${response.status} ${response.statusText}`);
  }

  const data: JobicyResponse = await response.json();
  return (data.jobs || []).map(normalizeJobicyJob);
}

function normalizeJobicyJob(job: JobicyJob): NormalizedJob {
  return {
    external_id: `jobicy_${job.id}`,
    source: "jobicy",
    title: job.jobTitle,
    company: job.companyName,
    location: job.jobGeo || "Remote",
    is_remote: true,
    description: stripHtml(job.jobDescription),
    salary_min: job.annualSalaryMin ?? null,
    salary_max: job.annualSalaryMax ?? null,
    salary_currency: job.salaryCurrency || "USD",
    job_type: job.jobType?.[0] ?? null,
    experience_level: mapJobicyLevel(job.jobLevel),
    application_url: job.url,
    posted_at: job.pubDate ? new Date(job.pubDate).toISOString() : null,
    expires_at: null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
