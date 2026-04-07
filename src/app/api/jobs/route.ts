import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// GET - Today's top matched jobs (with optional filters)
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const role = params.get("role")?.trim() || null;
  const h1b_sponsor = params.get("h1b_sponsor") === "true";
  const everified = params.get("everified") === "true";
  const date_posted = params.get("date_posted") || null; // "1d" | "3d" | "7d"
  const job_type = params.get("job_type") || null;
  const experience_level = params.get("experience_level") || null;

  // Fetch user's min_match_score preference (default 40)
  const { data: userPrefs } = await supabase
    .from("user_preferences")
    .select("min_match_score")
    .eq("user_id", user.id)
    .single();
  const minMatchScore: number = (userPrefs as { min_match_score?: number } | null)?.min_match_score ?? 40;

  // Use !inner so we can filter on embedded jobs columns
  let query = supabase
    .from("job_matches")
    .select(`
      id,
      score,
      score_breakdown,
      match_date,
      user_status,
      job_id,
      jobs!inner (
        id,
        title,
        company,
        location,
        is_remote,
        salary_min,
        salary_max,
        job_type,
        experience_level,
        skills_extracted,
        application_url,
        posted_at,
        quality_score,
        is_h1b_sponsor,
        is_everified,
        description
      )
    `)
    .eq("user_id", user.id)
    .is("user_status", null)
    .gte("score", minMatchScore)
    .order("score", { ascending: false })
    .limit(50); // fetch more so filters still yield enough results

  // Apply filters on the embedded jobs table
  if (role) {
    query = query.ilike("jobs.title", `%${role}%`);
  }
  if (h1b_sponsor) {
    query = query.eq("jobs.is_h1b_sponsor", true);
  }
  if (everified) {
    query = query.eq("jobs.is_everified", true);
  }
  if (date_posted) {
    const days = date_posted === "1d" ? 1 : date_posted === "3d" ? 3 : 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("jobs.posted_at", cutoff);
  }
  if (job_type) {
    query = query.ilike("jobs.job_type", `%${job_type}%`);
  }
  if (experience_level) {
    query = query.eq("jobs.experience_level", experience_level);
  }

  const { data: matches } = await query;
  // Trim to top 15 after filter
  const trimmed = (matches || []).slice(0, 15);

  return NextResponse.json({ matches: trimmed });
}
