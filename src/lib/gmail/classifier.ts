import { EmailCategory } from "@/lib/supabase/types";

// Known ATS / recruiting platform email domains — emails from these are system-generated
const ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "myworkday.com",
  "workday.com",
  "icims.com",
  "smartrecruiters.com",
  "jobvite.com",
  "taleo.net",
  "successfactors.com",
  "brassring.com",
  "bamboohr.com",
  "ashbyhq.com",
  "rippling.com",
  "recruitee.com",
  "jobs.lever.co",
];

/**
 * Classifies a job-related email by subject/sender/snippet using keyword matching.
 * Zero cost — no LLM involved.
 */
export function classifyEmail(
  subject: string | null,
  senderEmail: string | null,
  snippet: string | null
): EmailCategory {
  const s = (subject ?? "").toLowerCase();
  const snip = (snippet ?? "").toLowerCase();
  const combined = `${s} ${snip}`;

  // Offer — check first (most valuable, specific language)
  if (
    combined.match(
      /offer letter|pleased to offer|extend an offer|we('d| would) like to offer|job offer|employment offer|offer of employment/
    )
  ) {
    return "offer";
  }

  // Rejection
  if (
    combined.match(
      /unfortunately|not moving forward|decided to move forward with other|not selected|position has been filled|we will not|won't be moving|no longer being considered|not a match|decided not to|we've chosen|chosen another|not selected/
    )
  ) {
    return "rejection";
  }

  // Interview invite
  if (
    combined.match(
      /interview|phone screen|video call|technical round|coding (round|challenge|assessment)|take.?home|on.?site|hiring manager|schedule (a|your|the) (call|meeting|interview|time)|we('d| would) like to (meet|speak|chat|connect)|next (round|step|stage)/
    )
  ) {
    return "interview_invite";
  }

  // Application confirmation
  if (
    combined.match(
      /received your application|thank you for applying|application (submitted|received|complete|confirmed)|we got your application|successfully (submitted|applied)|application.*review|reviewing your application/
    )
  ) {
    return "application_confirmation";
  }

  // Recruiter outreach — unsolicited message from a human recruiter (not an ATS)
  const senderDomain = extractDomain(senderEmail);
  const fromAts = senderDomain
    ? ATS_DOMAINS.some((d) => senderDomain.endsWith(d))
    : false;

  if (
    !fromAts &&
    combined.match(
      /exciting opportunity|open (role|position|opening)|job opportunity|we('re| are) hiring|reach out|your (background|profile|experience) (caught|stood|is) |connect with you|great fit for|be a good fit/
    )
  ) {
    return "recruiter_outreach";
  }

  return "unknown";
}

/**
 * Extracts a company name from the sender/subject.
 * Used to attempt auto-linking emails to job_matches.
 */
export function extractCompanyName(
  subject: string | null,
  senderEmail: string | null
): string | null {
  // Try to parse "Application for [Role] at [Company]" or "Your application to [Company]"
  const s = subject ?? "";

  const atMatch = s.match(
    /\bat\s+([A-Z][A-Za-z0-9\s&,.-]{2,40}?)(?:\s*[!|–—,\-]|$)/
  );
  if (atMatch) return atMatch[1].trim();

  const toMatch = s.match(
    /\bto\s+([A-Z][A-Za-z0-9\s&,.-]{2,40}?)(?:\s*[!|–—,\-]|$)/
  );
  if (toMatch) return toMatch[1].trim();

  // Fall back to sender domain (excluding known ATS)
  const domain = extractDomain(senderEmail);
  if (!domain) return null;

  const isAts = ATS_DOMAINS.some((d) => domain.endsWith(d));
  if (isAts) return null;

  // Strip TLD and common email service prefixes, capitalise
  const parts = domain.split(".");
  const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractDomain(email: string | null): string | null {
  if (!email) return null;
  // Handles "Name <email@domain.com>" and plain "email@domain.com"
  const match = email.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : null;
}
