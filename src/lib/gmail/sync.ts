import { SupabaseClient } from "@supabase/supabase-js";
import { getValidGoogleToken, GmailTokenError } from "./token";
import { fetchJobEmails } from "./fetcher";
import { classifyEmail, extractCompanyName } from "./classifier";

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

/**
 * Fetches new job-related emails for a user and stores them in email_events.
 * Must be called with a service role Supabase client.
 *
 * Handles:
 * - Token refresh (via getValidGoogleToken)
 * - Incremental sync via historyId cursor
 * - Keyword classification
 * - Auto-linking to job_matches
 * - Graceful disconnect if refresh token is revoked
 */
export async function syncGmailForUser(
  userId: string,
  serviceSupabase: SupabaseClient
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  let accessToken: string;
  try {
    accessToken = await getValidGoogleToken(userId, serviceSupabase);
  } catch (err) {
    if (err instanceof GmailTokenError) {
      // Token revoked or not connected — clear stored tokens
      await serviceSupabase
        .from("profiles")
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          gmail_connected_at: null,
          gmail_sync_cursor: null,
        })
        .eq("id", userId);
      result.errors.push(`Gmail disconnected for user ${userId}: ${err.message}`);
      return result;
    }
    throw err;
  }

  // Read current sync cursor
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("gmail_sync_cursor")
    .eq("id", userId)
    .single();

  const cursor = profile?.gmail_sync_cursor ?? null;

  // Fetch emails from Gmail
  let messages;
  let newCursor: string | null;
  try {
    ({ messages, newCursor } = await fetchJobEmails(accessToken, cursor));
  } catch (err) {
    result.errors.push(`Gmail fetch failed: ${String(err)}`);
    return result;
  }

  if (messages.length === 0) {
    // Still update cursor if we got a new one
    if (newCursor && newCursor !== cursor) {
      await serviceSupabase
        .from("profiles")
        .update({ gmail_sync_cursor: newCursor })
        .eq("id", userId);
    }
    return result;
  }

  // Classify and build records
  const records = await Promise.all(
    messages.map(async (msg) => {
      const category = classifyEmail(msg.subject, msg.from, msg.snippet);
      const companyName = extractCompanyName(msg.subject, msg.from);

      // Parse sender name and email from "Name <email>" format
      const fromMatch = msg.from?.match(/^(.*?)\s*<(.+?)>$/) ?? null;
      const senderName = fromMatch ? fromMatch[1].trim() || null : null;
      const senderEmail = fromMatch
        ? fromMatch[2].trim()
        : msg.from?.trim() ?? null;

      // Parse received_at from RFC 2822 date header
      let receivedAt: string | null = null;
      if (msg.date) {
        const parsed = new Date(msg.date);
        if (!isNaN(parsed.getTime())) {
          receivedAt = parsed.toISOString();
        }
      }

      // Try to auto-link to a job_match
      let jobMatchId: string | null = null;
      if (companyName) {
        const { data: match } = await serviceSupabase
          .from("job_matches")
          .select("id, jobs!inner(company)")
          .eq("user_id", userId)
          .ilike("jobs.company", `%${companyName}%`)
          .limit(1)
          .single();
        if (match) jobMatchId = match.id;
      }

      return {
        user_id: userId,
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId,
        subject: msg.subject,
        sender_email: senderEmail,
        sender_name: senderName,
        snippet: msg.snippet || null,
        received_at: receivedAt,
        category,
        company_name: companyName,
        job_match_id: jobMatchId,
      };
    })
  );

  // Upsert — safe to re-run on duplicate message IDs
  const { error: upsertError } = await serviceSupabase
    .from("email_events")
    .upsert(records, { onConflict: "user_id,gmail_message_id" });

  if (upsertError) {
    result.errors.push(`Upsert failed: ${upsertError.message}`);
    return result;
  }

  result.synced = records.length;

  // Persist new cursor
  if (newCursor) {
    await serviceSupabase
      .from("profiles")
      .update({ gmail_sync_cursor: newCursor })
      .eq("id", userId);
  }

  return result;
}
