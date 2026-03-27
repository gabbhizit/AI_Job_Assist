import type {
  ParsedResume,
  ScoreBreakdown,
  Database,
} from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"];

const MINIMUM_MATCH_SCORE = 40;

// ============================================
// Title Matching (25 points max)
// ============================================
function scoreTitleMatch(targetRoles: string[], jobTitle: string): number {
  const titleLower = jobTitle.toLowerCase();
  const targets = targetRoles.map((r) => r.toLowerCase());

  // Exact match
  for (const target of targets) {
    if (titleLower === target || titleLower.includes(target)) {
      return 25;
    }
  }

  // Partial overlap (>50% words match)
  for (const target of targets) {
    const targetWords = target.split(/\s+/);
    const titleWords = titleLower.split(/\s+/);
    const matchCount = targetWords.filter((w) =>
      titleWords.some((tw) => tw.includes(w) || w.includes(tw))
    ).length;
    if (matchCount / targetWords.length > 0.5) {
      return 15;
    }
  }

  // Keyword match (common tech role keywords)
  const techKeywords = [
    "engineer", "developer", "programmer", "architect",
    "data", "ml", "ai", "devops", "cloud", "sre",
    "frontend", "backend", "fullstack", "full-stack",
  ];
  if (techKeywords.some((kw) => titleLower.includes(kw))) {
    return 8;
  }

  return 0;
}

// ============================================
// Skills Matching (35 points max)
// ============================================
function scoreSkillsOverlap(
  userSkills: string[],
  jobSkills: string[]
): { score: number; matchedSkills: string[] } {
  if (jobSkills.length === 0) {
    return { score: 15, matchedSkills: [] }; // Neutral if no skills extracted from JD
  }

  const userSet = new Set(userSkills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => userSet.has(s.toLowerCase()));

  const ratio = matched.length / jobSkills.length;
  const score = Math.round(ratio * 35);

  return { score: Math.min(score, 35), matchedSkills: matched };
}

// ============================================
// Location Matching (15 points max)
// ============================================
function scoreLocation(
  userPrefs: UserPreferences,
  job: Job
): number {
  // Remote job + user wants remote = perfect match
  if (job.is_remote) {
    if (
      userPrefs.remote_preference === "remote" ||
      userPrefs.remote_preference === "any"
    ) {
      return 15;
    }
    return 10;
  }

  if (!job.location || userPrefs.target_locations.length === 0) {
    return 5; // Neutral
  }

  const jobLocationLower = job.location.toLowerCase();
  for (const loc of userPrefs.target_locations) {
    const locLower = loc.toLowerCase();
    // Exact or partial match
    if (
      jobLocationLower.includes(locLower) ||
      locLower.includes(jobLocationLower)
    ) {
      return 15;
    }

    // Same state (extract state abbreviation)
    const jobState = extractState(jobLocationLower);
    const prefState = extractState(locLower);
    if (jobState && prefState && jobState === prefState) {
      return 10;
    }
  }

  return 0;
}

function extractState(location: string): string | null {
  // Match "CA", "NY", etc. at end of string or after comma
  const match = location.match(/,\s*([a-z]{2})\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

// ============================================
// Experience Level (10 points max)
// ============================================
function scoreExperience(
  userYears: number,
  jobLevel: string | null
): number {
  if (!jobLevel) return 5; // Neutral if unknown

  const levelMap: Record<string, [number, number]> = {
    entry: [0, 3],
    mid: [3, 7],
    senior: [7, 30],
  };

  const range = levelMap[jobLevel];
  if (!range) return 5;

  if (userYears >= range[0] && userYears <= range[1]) {
    return 10; // Exact match
  }

  // One level off
  const diff = Math.min(
    Math.abs(userYears - range[0]),
    Math.abs(userYears - range[1])
  );
  if (diff <= 2) {
    return 5;
  }

  return 0;
}

// ============================================
// Recency (10 points max)
// ============================================
function scoreRecency(postedAt: string | null): number {
  if (!postedAt) return 5; // Neutral

  const posted = new Date(postedAt);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff <= 1) return 10;
  if (daysDiff <= 3) return 8;
  if (daysDiff <= 7) return 5;
  if (daysDiff <= 14) return 2;
  return 0;
}

// ============================================
// Sponsor Signal (5 points max)
// Returns score + both badge flags
// ============================================
async function scoreSponsor(
  company: string,
  supabase: SupabaseClient
): Promise<{ score: number; isH1bSponsor: boolean; isEverify: boolean }> {
  // Normalize: lowercase, strip common suffixes like Inc, LLC, Corp, Ltd
  const companyLower = company
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?|company)\b/g, "")
    .trim();

  const { data } = await supabase
    .from("sponsor_friendly_companies")
    .select("company_name, is_everify")
    .eq("company_name", companyLower)
    .single() as { data: { company_name: string; is_everify: boolean } | null };

  return {
    score: data ? 5 : 0,
    isH1bSponsor: !!data,
    isEverify: data?.is_everify ?? false,
  };
}

// ============================================
// "Why Matched" Explanation Generator
// ============================================
function generateExplanation(
  breakdown: Omit<ScoreBreakdown, "explanation">,
  matchedSkills: string[],
  jobSkillsCount: number,
  titleMatchType: string,
  isSponsor: boolean
): string {
  const parts: string[] = [];

  // Strength assessment
  const total = breakdown.total;
  if (total >= 80) parts.push("Strong match");
  else if (total >= 60) parts.push("Good match");
  else parts.push("Potential match");

  // Skills info
  if (matchedSkills.length > 0) {
    const topSkills = matchedSkills.slice(0, 3).join(", ");
    parts.push(
      `your ${topSkills} skills match ${matchedSkills.length} of ${jobSkillsCount} required skills`
    );
  }

  // Title info
  if (titleMatchType === "exact") {
    parts.push("role matches your target exactly");
  } else if (titleMatchType === "partial") {
    parts.push("role is similar to your target");
  }

  // Sponsor
  if (isSponsor) {
    parts.push("company is a known H1B sponsor");
  }

  return parts.join(". ") + ".";
}

// ============================================
// Main Scoring Function
// ============================================
export async function computeMatchScore(
  resume: ParsedResume,
  userPrefs: UserPreferences,
  job: Job,
  supabase: SupabaseClient
): Promise<ScoreBreakdown | null> {
  // Use target roles from preferences, falling back to resume inference
  const targetRoles =
    userPrefs.target_roles.length > 0
      ? userPrefs.target_roles
      : resume.target_roles_inferred || [];

  const titleScore = scoreTitleMatch(targetRoles, job.title);
  const { score: skillsScore, matchedSkills } = scoreSkillsOverlap(
    resume.skills_flat,
    job.skills_extracted
  );
  const locationScore = scoreLocation(userPrefs, job);
  const experienceScore = scoreExperience(
    resume.total_years_experience,
    job.experience_level
  );
  const recencyScore = scoreRecency(job.posted_at);
  const { score: sponsorScore, isH1bSponsor, isEverify } = await scoreSponsor(job.company, supabase);

  const total =
    titleScore +
    skillsScore +
    locationScore +
    experienceScore +
    recencyScore +
    sponsorScore;

  // Below minimum threshold — don't show this job
  if (total < MINIMUM_MATCH_SCORE) {
    return null;
  }

  // Determine title match type for explanation
  let titleMatchType = "keyword";
  if (titleScore >= 25) titleMatchType = "exact";
  else if (titleScore >= 15) titleMatchType = "partial";

  const explanation = generateExplanation(
    {
      title: titleScore,
      skills: skillsScore,
      location: locationScore,
      experience: experienceScore,
      recency: recencyScore,
      sponsor: sponsorScore,
      total,
    },
    matchedSkills,
    job.skills_extracted.length,
    titleMatchType,
    isH1bSponsor
  );

  return {
    title: titleScore,
    skills: skillsScore,
    location: locationScore,
    experience: experienceScore,
    recency: recencyScore,
    sponsor: sponsorScore,
    total,
    explanation,
    is_h1b_sponsor: isH1bSponsor,
    is_everify: isEverify,
  };
}

/**
 * Match all active jobs to a single user. Returns the number of matches created.
 */
export async function matchJobsForUser(
  userId: string,
  resume: ParsedResume,
  userPrefs: UserPreferences,
  supabase: SupabaseClient
): Promise<number> {
  // Get all active jobs
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true);

  if (error || !jobs) return 0;

  let matchCount = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const job of jobs) {
    const breakdown = await computeMatchScore(resume, userPrefs, job, supabase);
    if (!breakdown) continue;

    // Upsert match (update score if already exists)
    await supabase.from("job_matches").upsert(
      {
        user_id: userId,
        job_id: job.id,
        score: breakdown.total,
        score_breakdown: breakdown,
        match_date: today,
      },
      { onConflict: "user_id,job_id" }
    );

    matchCount++;
  }

  return matchCount;
}
