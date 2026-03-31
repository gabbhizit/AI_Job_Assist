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
 * Bootstrap mode (newParsedResume omitted OR no cache row):
 *   → queries all primary resumes from DB → Claude generates full list.
 * Incremental mode (cache row exists AND newParsedResume provided):
 *   → sends new resume + existing list → Claude merges + dedupes.
 *
 * Returns { addedRoles, allRoles, allLocations }.
 * addedRoles = net-new roles vs old cache (all roles on bootstrap).
 */
export async function generateSearchParamsCache(
  supabase: SupabaseClient,
  newParsedResume?: ParsedResume
): Promise<{ addedRoles: string[]; allRoles: string[]; allLocations: string[] }> {
  // Read existing cache
  const { data: cacheRow } = await supabase
    .from("search_params_cache")
    .select("roles, locations")
    .eq("id", 1)
    .single();

  let result: { roles: string[]; locations: string[] };
  const existingRoles: string[] = cacheRow?.roles ?? [];

  if (!cacheRow || !newParsedResume) {
    // ── Bootstrap: no cache yet, or called without a new resume ──────────
    const { data: resumes } = await supabase
      .from("resumes")
      .select("parsed_data")
      .eq("is_primary", true)
      .eq("parsing_status", "completed");

    const summaries: ResumeCompactSummary[] = (resumes ?? [])
      .map((r) => r.parsed_data as ParsedResume | null)
      .filter((d): d is ParsedResume => !!d)
      .map(buildCompactSummary);

    // Include the newly uploaded resume even if not yet committed to DB
    if (newParsedResume) summaries.push(buildCompactSummary(newParsedResume));

    if (summaries.length === 0) {
      console.log("[search-params] no resumes found — skipping cache generation");
      return { addedRoles: [], allRoles: [], allLocations: [] };
    }

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

    await supabase.from("search_params_cache").upsert({
      id: 1,
      roles: result.roles,
      locations: result.locations,
      generated_at: new Date().toISOString(),
    });

    console.log(
      `[search-params] cache bootstrapped — ${result.roles.length} roles, ${result.locations.length} locations`
    );

    return { addedRoles: result.roles, allRoles: result.roles, allLocations: result.locations };
  }

  // ── Incremental: cache exists + new resume provided ─────────────────────
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

  const oldRolesSet = new Set(existingRoles.map((r) => r.toLowerCase()));
  const addedRoles = result.roles.filter((r) => !oldRolesSet.has(r.toLowerCase()));

  await supabase.from("search_params_cache").upsert({
    id: 1,
    roles: result.roles,
    locations: result.locations,
    generated_at: new Date().toISOString(),
  });

  console.log(
    `[search-params] cache updated — ${result.roles.length} roles, ${result.locations.length} locations, ${addedRoles.length} new roles added`
  );

  return { addedRoles, allRoles: result.roles, allLocations: result.locations };
}

/** Deduplicate a string array case-insensitively, preserving first-seen casing. */
function dedupeInsensitive(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Read the cached search params and MERGE with hardcoded defaults.
 *
 * Cache-derived entries come first (user-specific), defaults fill the rest.
 * If cache is empty → auto-bootstraps from existing DB resumes via Claude first.
 * Applies env-based caps after merging (dev: small, prod: full).
 */
export async function getSearchParams(
  supabase: SupabaseClient
): Promise<{ queries: string[]; locations: string[] }> {
  let cachedRoles: string[] = [];
  let cachedLocations: string[] = [];

  try {
    const { data } = await supabase
      .from("search_params_cache")
      .select("roles, locations")
      .eq("id", 1)
      .single();

    if (data && (data.roles as string[]).length > 0) {
      cachedRoles     = data.roles as string[];
      cachedLocations = data.locations as string[];
    } else {
      // Cache empty — auto-bootstrap from existing resumes
      console.log("[search-params] cache empty — bootstrapping from existing resumes...");
      const { allRoles, allLocations } = await generateSearchParamsCache(supabase);
      cachedRoles     = allRoles;
      cachedLocations = allLocations;
    }
  } catch (err) {
    console.error("[search-params] getSearchParams error:", err);
  }

  // Merge: cache-derived first, then hardcoded defaults to fill gaps — deduplicated
  const queries   = dedupeInsensitive([...cachedRoles,     ...DEFAULT_QUERIES]).slice(0, MAX_QUERIES);
  const locations = dedupeInsensitive([...cachedLocations, ...DEFAULT_LOCATIONS]).slice(0, MAX_LOCATIONS);

  console.log(`[search-params] using ${queries.length} queries, ${locations.length} locations (${cachedRoles.length} from cache + defaults)`);
  return { queries, locations };
}
