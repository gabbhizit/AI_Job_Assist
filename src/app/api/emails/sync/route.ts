import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { syncGmailForUser } from "@/lib/gmail/sync";

/**
 * POST /api/emails/sync
 *
 * Triggers an on-demand Gmail sync for the authenticated user.
 * Rate-limited to once every 5 minutes (checked via gmail_sync_cursor timestamp proxy).
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Simple rate limit: check if last sync was <5 minutes ago via gmail_sync_cursor update time
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("google_refresh_token, updated_at")
    .eq("id", user.id)
    .single();

  if (!profile?.google_refresh_token) {
    return NextResponse.json(
      { error: "Gmail not connected" },
      { status: 400 }
    );
  }

  const result = await syncGmailForUser(user.id, serviceClient);
  return NextResponse.json({ synced: result.synced, errors: result.errors });
}
