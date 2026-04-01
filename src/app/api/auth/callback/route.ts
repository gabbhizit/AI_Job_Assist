import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { session } = data;

      // Capture Google provider tokens if Gmail scope was granted.
      // provider_refresh_token is only present when access_type=offline + prompt=consent was used.
      if (session.provider_token && session.provider_refresh_token) {
        try {
          const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await serviceClient
            .from("profiles")
            .update({
              google_access_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              google_token_expires_at: new Date(
                Date.now() + 3500 * 1000 // ~58 min — slightly before Google's 1hr expiry
              ).toISOString(),
              gmail_connected_at: new Date().toISOString(),
            })
            .eq("id", session.user.id);
        } catch {
          // Non-fatal — user is still authenticated, Gmail just won't work until reconnect
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
