import { SupabaseClient } from "@supabase/supabase-js";

export class GmailTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmailTokenError";
  }
}

/**
 * Returns a valid Google access token for the user.
 * Refreshes automatically if the stored token is expiring within 5 minutes.
 * Throws GmailTokenError if no refresh token is stored (Gmail not connected).
 *
 * Must be called with a service role client — reads/writes token columns on profiles.
 */
export async function getValidGoogleToken(
  userId: string,
  serviceSupabase: SupabaseClient
): Promise<string> {
  const { data: profile, error } = await serviceSupabase
    .from("profiles")
    .select(
      "google_access_token, google_refresh_token, google_token_expires_at"
    )
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new GmailTokenError("Profile not found");
  }

  if (!profile.google_refresh_token) {
    throw new GmailTokenError("Gmail not connected — no refresh token stored");
  }

  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0;
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

  // Token is still valid
  if (profile.google_access_token && expiresAt > fiveMinutesFromNow) {
    return profile.google_access_token;
  }

  // Refresh the token
  const refreshed = await refreshGoogleToken(profile.google_refresh_token);

  // Persist the new token
  await serviceSupabase
    .from("profiles")
    .update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", userId);

  return refreshed.access_token;
}

async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GmailTokenError(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
}
