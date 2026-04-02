import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
      user_status,
      status_updated_at,
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
        is_h1b_sponsor,
        is_everified,
        description
      )
    `)
    .eq("user_id", user.id)
    .eq("user_status", "saved")
    .order("status_updated_at", { ascending: false });

  return NextResponse.json({ matches: matches || [] });
}
