import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Today's top 15 matched jobs
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: matches } = await supabase
    .from("job_matches")
    .select(`
      id,
      score,
      score_breakdown,
      match_date,
      user_status,
      job_id,
      jobs (
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
        quality_score
      )
    `)
    .eq("user_id", user.id)
    .is("user_status", null)
    .order("score", { ascending: false })
    .limit(15);

  return NextResponse.json({ matches: matches || [] });
}
