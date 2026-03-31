import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedResume } from "@/lib/supabase/types";

// Fallback defaults — used when cache is empty or on error
export const DEFAULT_QUERIES = [
  "software engineer",
  "backend developer",
  "frontend developer",
  "data engineer",
  "ML engineer",
  "devops engineer",
  "software developer",
  "new grad software engineer",
];

export const DEFAULT_LOCATIONS = [
  "United States",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
];

// Cap query/location counts to control API call volume
const MAX_QUERIES = process.env.NODE_ENV === "production" ? 15 : 3;
const MAX_LOCATIONS = process.env.NODE_ENV === "production" ? 8 : 1;

interface ResumeCompactSummary {
  inferred_roles: string[];
  top_skills: string[];
  experience_titles: string[];
  locations: string[];
}

function buildCompactSummary(resume: ParsedResume): ResumeCompactSummary {
  return {
    inferred_roles: resume.target_roles_inferred ?? [],
    top_skills: (resume.skills_flat ?? []).slice(0, 20),
    experience_titles: (resume.experience ?? []).map((e) => e.title).filter(Boolean),
    locations: (resume.experience ?? [])
      .map((e) => e.location)
      .filter((l): l is string => !!l),
  };
}

async function callClaude(prompt: string): Promise<{ roles: string[]; locations: string[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Extract JSON from the response (handle markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude response did not contain valid JSON");

  const parsed = JSON.parse(jsonMatch[0]) as { roles?: unknown; locations?: unknown };

  const roles = Array.isArray(parsed.roles)
    ? (parsed.roles as string[]).filter((r) => typeof r === "string" && r.trim())
    : [];
  const locations = Array.isArray(parsed.locations)
    ? (parsed.locations as string[]).filter((l) => typeof l === "string" && l.trim())
    : [];

  return { roles, locations };
}

/**
 * Generate (or update) the search params cache using Claude.
 *
 * Bootstrap mode: no cache row exists → query all primary resumes → Claude generates full list.
 * Incremental mode: cache row exists → send new resume + existing list → Claude merges + dedupes.
 *
 * Returns the net-new roles added to the cache (for targeted delta fetch).
 */
export async function generateSearchParamsCache(
  supabase: SupabaseClient,
  newParsedResume: ParsedResume
): Promise<{ addedRoles: string[]; allLocations: string[] }> {
  // Read existing cache
  const { data: cacheRow } = await supabase
    .from("search_params_cache")
    .select("roles, locations")
    .eq("id", 1)
    .single();

  let result: { roles: string[]; locations: string[] };

  if (!cacheRow) {
    // ── Bootstrap: no cache yet — gather all primary resumes ──────────────
    const { data: resumes } = await supabase
      .from("resumes")
      .select("parsed_data")
      .eq("is_primary", true)
      .eq("parsing_status", "completed");

    const summaries: ResumeCompactSummary[] = (resumes ?? [])
      .map((r) => r.parsed_data as ParsedResume | null)
      .filter((d): d is ParsedResume => !!d)
      .map(buildCompactSummary);

    // Include the newly uploaded resume even if not yet in DB as primary+completed
    summaries.push(buildCompactSummary(newParsedResume));

    const prompt = `You are helping a job search platform. Given these user resume summaries, generate a comprehensive, deduplicated list of job search queries and US city locations to use when fetching job listings from APIs like Google Jobs.

Resume summaries:
${JSON.stringify(summaries, null, 2)}

Rules:
- Roles should be job titles suitable as search queries (e.g. "software engineer", "ml engineer", "data scientist")
- Locations should be US cities (e.g. "San Francisco, CA") or "United States". Do NOT include "Remote".
- Deduplicate and normalize similar roles (e.g. "SWE" → "software engineer")
- Max 15 roles, max 8 locations. Always include "United States".

Return ONLY valid JSON with no explanation: { "roles": string[], "locations": string[] }`;

    result = await callClaude(prompt);
  } else {
    // ── Incremental: cache exists — merge new resume into existing list ────
    const existingRoles: string[] = cacheRow.roles ?? [];
    const existingLocations: string[] = cacheRow.locations ?? [];
    const newSummary = buildCompactSummary(newParsedResume);

    const prompt = `You are helping a job search platform. Here is an existing list of job search parameters and a new user's resume summary. Merge them into an updated, deduplicated, normalized list.

Existing search params:
${JSON.stringify({ roles: existingRoles, locations: existingLocations }, null, 2)}

New resume summary:
${JSON.stringify(newSummary, null, 2)}

Rules:
- Roles should be job titles suitable as search queries (e.g. "software engineer", "ml engineer")
- Locations should be US cities (e.g. "San Francisco, CA") or "United States". Do NOT include "Remote".
- Deduplicate and normalize. Keep existing items unless the new resume clearly supersedes them.
- Max 15 roles, max 8 locations. Always include "United States".

Return ONLY valid JSON with no explanation: { "roles": string[], "locations": string[] }`;

    result = await callClaude(prompt);

    // Compute diff: which roles are net-new vs old cache
    const oldRolesSet = new Set(existingRoles.map((r) => r.toLowerCase()));
    const addedRoles = result.roles.filter((r) => !oldRolesSet.has(r.toLowerCase()));

    // Upsert updated cache
    await supabase.from("search_params_cache").upsert({
      id: 1,
      roles: result.roles,
      locations: result.locations,
      generated_at: new Date().toISOString(),
    });

    console.log(
      `[search-params] cache updated — ${result.roles.length} roles, ${result.locations.length} locations, ${addedRoles.length} new roles added`
    );

    return { addedRoles, allLocations: result.locations };
  }

  // Bootstrap: upsert, all roles are "added" (first time)
  await supabase.from("search_params_cache").upsert({
    id: 1,
    roles: result.roles,
    locations: result.locations,
    generated_at: new Date().toISOString(),
  });

  console.log(
    `[search-params] cache bootstrapped — ${result.roles.length} roles, ${result.locations.length} locations`
  );

  return { addedRoles: result.roles, allLocations: result.locations };
}

/**
 * Read the cached search params for use in the daily pipeline.
 * Falls back to hardcoded defaults if cache is empty or missing.
 * Applies env-based caps (dev: small, prod: full).
 */
export async function getSearchParams(
  supabase: SupabaseClient
): Promise<{ queries: string[]; locations: string[] }> {
  try {
    const { data } = await supabase
      .from("search_params_cache")
      .select("roles, locations")
      .eq("id", 1)
      .single();

    if (data && (data.roles as string[]).length > 0) {
      const queries = (data.roles as string[]).slice(0, MAX_QUERIES);
      const locations = (data.locations as string[]).slice(0, MAX_LOCATIONS);
      return { queries, locations };
    }
  } catch {
    // Fall through to defaults
  }

  return {
    queries: DEFAULT_QUERIES.slice(0, MAX_QUERIES),
    locations: DEFAULT_LOCATIONS.slice(0, MAX_LOCATIONS),
  };
}
