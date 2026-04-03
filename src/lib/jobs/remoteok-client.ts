import type { NormalizedJob } from "./jsearch-client";

interface RemoteOKJob {
  id: string;
  slug: string;
  company: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  apply_url: string;
  url: string;
  salary_min: number;
  salary_max: number;
  date: string;
  epoch: number;
}

// Tags that indicate a tech role
const TECH_TAGS = new Set([
  "dev", "engineering", "backend", "frontend", "fullstack", "full-stack",
  "python", "javascript", "typescript", "react", "node", "java", "golang",
  "rust", "devops", "sre", "aws", "gcp", "azure", "cloud", "data", "ml",
  "ai", "machine-learning", "deep-learning", "infrastructure", "mobile",
  "ios", "android", "security", "qa", "database", "api", "saas",
]);

function isTechJob(tags: string[]): boolean {
  return tags.map((t) => t.toLowerCase()).some((t) => TECH_TAGS.has(t));
}

export async function fetchRemoteOKJobs(): Promise<NormalizedJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    headers: {
      // RemoteOK requires a User-Agent header
      "User-Agent": "AI Job Copilot/1.0 (job search aggregator for tech professionals)",
    },
  });

  if (!response.ok) {
    throw new Error(`RemoteOK API error: ${response.status} ${response.statusText}`);
  }

  const raw: unknown[] = await response.json();

  // First element is always a legal notice object, not a job — skip it
  const jobs = (Array.isArray(raw) ? raw.slice(1) : []).filter(
    (item): item is RemoteOKJob =>
      !!item &&
      typeof item === "object" &&
      "position" in (item as object) &&
      "id" in (item as object)
  );

  // Only keep tech-relevant jobs
  return jobs
    .filter((j) => isTechJob(j.tags || []))
    .map(normalizeRemoteOKJob);
}

function normalizeRemoteOKJob(job: RemoteOKJob): NormalizedJob {
  const description = job.description
    ? job.description.replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim()
    : "";

  return {
    external_id: `remoteok_${job.id}`,
    source: "remoteok",
    title: job.position,
    company: job.company,
    location: job.location || "Remote",
    is_remote: true,
    description,
    salary_min: job.salary_min > 0 ? job.salary_min : null,
    salary_max: job.salary_max > 0 ? job.salary_max : null,
    salary_currency: "USD",
    job_type: "Full-time",
    experience_level: null,
    application_url: job.apply_url || job.url,
    posted_at: job.epoch ? new Date(job.epoch * 1000).toISOString() : null,
    expires_at: null,
    raw_data: job as unknown as Record<string, unknown>,
  };
}
