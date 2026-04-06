import { createServiceRoleClient } from "@/lib/supabase/server";
import { cleanupStaleJobs } from "@/lib/jobs/fetcher";
import { matchJobsForUser } from "@/lib/matching/scorer";
import { createPipelineLog } from "@/lib/utils/pipeline-logger";
import { syncGmailForUser } from "@/lib/gmail/sync";
import { sendDailyDigest } from "@/lib/email/digest";
import type { ParsedResume, Database, ScoreBreakdown } from "@/lib/supabase/types";
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

  // Step 1: Match jobs to users
  // Note: job fetching runs separately via /api/cron/fetch-jobs (scheduled 1h before)
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

  // Step 3: Send daily digest emails
  log.step("notify");
  try {
    // Get distinct users who have unnotified matches
    const { data: unnotifiedRows } = await supabase
      .from("job_matches")
      .select("user_id")
      .eq("is_notified", false) as { data: { user_id: string }[] | null };

    const uniqueUserIds = [...new Set((unnotifiedRows ?? []).map((r) => r.user_id))];
    const isSunday = new Date().getUTCDay() === 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const userId of uniqueUserIds) {
      // Check notification preferences
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("notify_email, notify_frequency")
        .eq("user_id", userId)
        .single() as { data: { notify_email: boolean; notify_frequency: "daily" | "weekly" } | null };

      // Mark notified (suppress delivery) if user opted out — prevents unbounded accumulation
      if (!prefs?.notify_email) {
        await supabase
          .from("job_matches")
          .update({ is_notified: true })
          .eq("user_id", userId)
          .eq("is_notified", false);
        continue;
      }

      // Respect frequency: weekly users only get emails on Sunday
      if (prefs.notify_frequency === "weekly" && !isSunday) continue;

      // Get user email + name
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single() as { data: { email: string; full_name: string } | null };

      if (!profile?.email) continue;

      // Fetch top 5 unnotified matches with job details
      const { data: matches } = await supabase
        .from("job_matches")
        .select(`
          id,
          job_id,
          score,
          score_breakdown,
          jobs (
            title,
            company,
            location,
            is_remote,
            salary_min,
            salary_max
          )
        `)
        .eq("user_id", userId)
        .eq("is_notified", false)
        .order("score", { ascending: false })
        .limit(5) as {
          data: {
            id: string;
            job_id: string;
            score: number;
            score_breakdown: ScoreBreakdown;
            jobs: {
              title: string;
              company: string;
              location: string | null;
              is_remote: boolean;
              salary_min: number | null;
              salary_max: number | null;
            } | null;
          }[] | null;
        };

      if (!matches || matches.length === 0) continue;

      const digestJobs = matches
        .filter((m) => m.jobs !== null)
        .map((m) => ({
          jobId: m.job_id,
          title: m.jobs!.title,
          company: m.jobs!.company,
          location: m.jobs!.location,
          isRemote: m.jobs!.is_remote,
          salaryMin: m.jobs!.salary_min,
          salaryMax: m.jobs!.salary_max,
          score: m.score,
          isH1bSponsor: m.score_breakdown?.is_h1b_sponsor ?? false,
          explanation: m.score_breakdown?.explanation ?? "Strong match for your profile.",
        }));

      const { success, error: sendError } = await sendDailyDigest({
        toEmail: profile.email,
        userName: profile.full_name,
        jobs: digestJobs,
      });

      if (success) {
        // Mark all this user's unnotified matches as notified
        await supabase
          .from("job_matches")
          .update({ is_notified: true })
          .eq("user_id", userId)
          .eq("is_notified", false);
        emailsSent++;
      } else {
        console.error(`Digest send failed for user ${userId}:`, sendError);
        emailsFailed++;
      }
    }

    log.success("notify", {
      usersProcessed: uniqueUserIds.length,
      emailsSent,
      emailsFailed,
    });
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

  // Step 5: Sync Gmail for all connected users
  log.step("gmail_sync");
  try {
    const { data: connectedUsers } = await supabase
      .from("profiles")
      .select("id")
      .not("google_refresh_token", "is", null) as { data: { id: string }[] | null };

    let totalEmailsSynced = 0;
    for (const profile of connectedUsers ?? []) {
      const result = await syncGmailForUser(profile.id, supabase);
      totalEmailsSynced += result.synced;
    }

    log.success("gmail_sync", {
      usersProcessed: connectedUsers?.length ?? 0,
      totalEmailsSynced,
    });
  } catch (e) {
    log.error("gmail_sync", e);
  }

  // Step 6: Alert on failures
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
