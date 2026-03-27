import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAndFilterJobs, cleanupStaleJobs } from "@/lib/jobs/fetcher";
import { matchJobsForUser } from "@/lib/matching/scorer";
import { createPipelineLog } from "@/lib/utils/pipeline-logger";
import type { ParsedResume, Database } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Vercel Pro: 60s max

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const log = createPipelineLog();

  // Step 1: Fetch jobs
  log.step("fetch");
  try {
    const result = await fetchAndFilterJobs(supabase);
    log.success("fetch", {
      fetched: result.fetched,
      filtered: result.filtered,
      stored: result.stored,
      errors: result.errors.length,
    });
  } catch (e) {
    log.error("fetch", e);
  }

  // Step 2: Match jobs to users
  log.step("match");
  try {
    const { data: users } = await supabase
      .from("resumes")
      .select("user_id, parsed_data")
      .eq("is_primary", true)
      .eq("parsing_status", "completed") as { data: { user_id: string; parsed_data: unknown }[] | null };

    let usersMatched = 0;
    let totalMatches = 0;

    if (users) {
      for (const userResume of users) {
        if (!userResume.parsed_data) continue;

        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userResume.user_id)
          .single();

        if (prefs) {
          const matchCount = await matchJobsForUser(
            userResume.user_id,
            userResume.parsed_data as ParsedResume,
            prefs as Database["public"]["Tables"]["user_preferences"]["Row"],
            supabase
          );
          usersMatched++;
          totalMatches += matchCount;
        }
      }
    }

    log.success("match", { usersMatched, totalMatches });
  } catch (e) {
    log.error("match", e);
  }

  // Step 3: Send notifications (mark as notified for now, email later)
  log.step("notify");
  try {
    // TODO: Integrate Resend for actual email sending
    const { data: unnotified } = await supabase
      .from("job_matches")
      .select("id, user_id")
      .eq("is_notified", false) as { data: { id: string; user_id: string }[] | null };

    if (unnotified && unnotified.length > 0) {
      for (const match of unnotified) {
        await supabase.from("job_matches")
          .update({ is_notified: true })
          .eq("id", match.id);
      }
    }

    log.success("notify", { emailsSent: 0, matchesNotified: unnotified?.length ?? 0 });
  } catch (e) {
    log.error("notify", e);
  }

  // Step 4: Cleanup (weekly — Sunday)
  if (new Date().getUTCDay() === 0) {
    log.step("cleanup");
    try {
      const cleaned = await cleanupStaleJobs(supabase);
      log.success("cleanup", { jobsDeactivated: cleaned });
    } catch (e) {
      log.error("cleanup", e);
    }
  }

  // Step 5: Alert on failures
  if (log.hasErrors()) {
    // TODO: Send alert email via Resend to ADMIN_EMAIL
    console.error("Pipeline errors:", JSON.stringify(log.summary()));
  }

  // Store log
  await supabase.from("pipeline_logs").insert({
    steps: JSON.parse(JSON.stringify(log.summary())),
  });

  return NextResponse.json({ status: "complete", ...log.summary() });
}
