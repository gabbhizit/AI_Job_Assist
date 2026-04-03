interface RawJob {
  title?: string;
  company?: string;
  location?: string | null;
  description?: string | null;
  application_url?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  posted_at?: string | null;
  is_remote?: boolean;
}

// Titles that indicate non-tech roles
const IRRELEVANT_TITLE_KEYWORDS = [
  "nurse", "nursing", "teacher", "teaching", "driver", "driving",
  "sales representative", "sales associate", "accountant", "accounting",
  "mechanic", "plumber", "electrician", "janitor", "custodian",
  "receptionist", "cashier", "barista", "waiter", "waitress",
  "chef", "cook", "housekeeper", "landscaper", "security guard",
  "dental", "medical assistant", "pharmacy", "veterinary",
  "real estate agent", "insurance agent", "loan officer",
];

// Tech-related title keywords
const TECH_TITLE_KEYWORDS = [
  "engineer", "developer", "programmer", "architect", "devops",
  "sre", "data scientist", "data analyst", "data engineer",
  "machine learning", "ml engineer", "ai engineer",
  "frontend", "backend", "full stack", "fullstack", "full-stack",
  "software", "cloud", "infrastructure", "platform",
  "security engineer", "cybersecurity", "devsecops",
  "qa", "quality assurance", "test engineer", "sdet",
  "technical", "tech lead", "cto", "vp engineering",
  "product manager", "product owner", "scrum master",
  "solutions architect", "systems engineer",
];

// Non-US indicators
const NON_US_INDICATORS = [
  "united kingdom", "uk", "london, uk", "germany", "berlin",
  "india", "bangalore", "mumbai", "hyderabad", "chennai", "pune",
  "canada", "toronto", "vancouver", "montreal",
  "australia", "sydney", "melbourne",
  "singapore", "japan", "tokyo", "china", "shanghai", "beijing",
  "france", "paris", "netherlands", "amsterdam",
  "brazil", "mexico", "philippines",
];

/**
 * Check if a job should be hard-rejected (never stored).
 * Returns a rejection reason or null if the job passes.
 */
export function hardReject(job: RawJob): string | null {
  if (!job.title || job.title.trim() === "") {
    return "missing_title";
  }

  if (!job.description || job.description.trim().length < 50) {
    return "missing_or_short_description";
  }

  if (!job.application_url || job.application_url.trim() === "") {
    return "missing_application_url";
  }

  const titleLower = job.title.toLowerCase();
  for (const keyword of IRRELEVANT_TITLE_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      return `irrelevant_title: ${keyword}`;
    }
  }

  // Check for non-US location
  if (job.location) {
    const locationLower = job.location.toLowerCase();
    for (const indicator of NON_US_INDICATORS) {
      if (locationLower.includes(indicator)) {
        return `non_us_location: ${indicator}`;
      }
    }
  }

  // Check posted date > 30 days
  if (job.posted_at) {
    const postedDate = new Date(job.posted_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (postedDate < thirtyDaysAgo) {
      return "posted_too_old";
    }
  }

  return null;
}

/**
 * Score a job's quality (0-100). Jobs below threshold should be rejected.
 */
export function scoreJobQuality(job: RawJob): number {
  let score = 0;

  // Has description > 200 chars (+20)
  if (job.description && job.description.length > 200) {
    score += 20;
  }

  // Has company name (+15)
  if (job.company && job.company.trim() !== "") {
    score += 15;
  }

  // Has application URL (+15)
  if (job.application_url && job.application_url.trim() !== "") {
    score += 15;
  }

  // Has salary info (+10)
  if (job.salary_min || job.salary_max) {
    score += 10;
  }

  // Title contains tech keywords (+20)
  if (job.title) {
    const titleLower = job.title.toLowerCase();
    if (TECH_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw))) {
      score += 20;
    }
  }

  // Has location or marked remote (+10)
  if ((job.location && job.location.trim() !== "") || job.is_remote) {
    score += 10;
  }

  // Posted within 7 days (+10)
  if (job.posted_at) {
    const postedDate = new Date(job.posted_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (postedDate >= sevenDaysAgo) {
      score += 10;
    }
  }

  return score;
}

/**
 * Filter a job: returns quality score if job passes, or null if rejected.
 * Quality threshold: 30 (jobs below are rejected).
 */
export function filterJob(job: RawJob): { pass: boolean; score: number; reason?: string } {
  const rejection = hardReject(job);
  if (rejection) {
    return { pass: false, score: 0, reason: rejection };
  }

  const score = scoreJobQuality(job);
  if (score < 30) {
    return { pass: false, score, reason: `quality_score_too_low: ${score}` };
  }

  return { pass: true, score };
}
