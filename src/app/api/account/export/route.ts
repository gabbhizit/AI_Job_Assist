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

  const [profileRes, prefsRes, resumesRes, matchesRes, interactionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, visa_status, opt_end_date, plan, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("user_preferences")
        .select(
          "target_roles, target_locations, min_salary, experience_level, remote_preference, excluded_companies, notify_email, notify_frequency, min_match_score"
        )
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("resumes")
        .select("file_name, parsing_status, parsing_confidence, parsed_data, created_at")
        .eq("user_id", user.id),
      supabase
        .from("job_matches")
        .select(
          "score, user_status, match_date, explanation, jobs(title, company, location, application_url)"
        )
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(200),
      supabase
        .from("user_interactions")
        .select("action, created_at, jobs(title, company)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    preferences: prefsRes.data,
    resumes: resumesRes.data ?? [],
    job_matches: matchesRes.data ?? [],
    interactions: interactionsRes.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="offerpath-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
