import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedResume, Database } from "@/lib/supabase/types";
import { fetchAndFilterJobs } from "./fetcher";
import { matchJobsForUser } from "@/lib/matching/scorer";

type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"];

/**
 * Runs a targeted fetch + match after a resume upload.
 *
 * - If addedRoles is non-empty: fetches jobs for only those new roles × allLocations
 *   so the user gets fresh results for their unique profile immediately.
 * - Always re-runs matching for this specific user (re-scores all active jobs
 *   against the updated resume, even if no new roles were added).
 */
export async function runDeltaFetchAndMatch(
  supabase: SupabaseClient,
  userId: string,
  addedRoles: string[],
  allLocations: string[],
  parsedResume: ParsedResume
): Promise<void> {
  // Targeted fetch for net-new roles only
  if (addedRoles.length > 0) {
    console.log(
      `[delta-pipeline] fetching jobs for ${addedRoles.length} new roles: ${addedRoles.join(", ")}`
    );
    try {
      const fetchResult = await fetchAndFilterJobs(supabase, {
        queries: addedRoles,
        locations: allLocations,
      });
      console.log(
        `[delta-pipeline] fetch done — fetched: ${fetchResult.fetched}, stored: ${fetchResult.stored}, filtered: ${fetchResult.filtered}`
      );
    } catch (err) {
      console.error("[delta-pipeline] targeted fetch failed:", err);
      // Continue to matching even if fetch failed — match against existing jobs
    }
  }

  // Re-match this user against all active jobs in DB
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!prefs) {
    console.log(`[delta-pipeline] no preferences found for user ${userId}, skipping match`);
    return;
  }

  try {
    const matchCount = await matchJobsForUser(
      userId,
      parsedResume,
      prefs as UserPreferences,
      supabase
    );
    console.log(`[delta-pipeline] matched ${matchCount} jobs for user ${userId}`);
  } catch (err) {
    console.error(`[delta-pipeline] matching failed for user ${userId}:`, err);
  }
}
