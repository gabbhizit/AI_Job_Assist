import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/emails/connect
 *
 * Initiates a Google OAuth re-consent flow that requests the gmail.readonly scope.
 * Redirects back to /dashboard/emails after completion via the standard auth callback.
 *
 * Used by users who skipped Gmail access during initial sign-in, or whose
 * token was revoked.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=/dashboard/emails`,
      scopes:
        "openid email profile https://www.googleapis.com/auth/gmail.readonly",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/dashboard/emails?error=connect_failed`);
  }

  return NextResponse.redirect(data.url);
}
