import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { company, title, url, status, notes } = body as {
    company: string;
    title: string;
    url?: string;
    status: string;
    notes?: string;
  };

  if (!company?.trim() || !title?.trim()) {
    return NextResponse.json({ error: "company and title are required" }, { status: 400 });
  }

  // Upsert a minimal job record so we have a job_id to reference
  const externalId = `manual_${user.id}_${Date.now()}`;
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      external_id: externalId,
      source: "manual",
      title: title.trim(),
      company: company.trim(),
      application_url: url?.trim() || null,
      skills_extracted: [],
      quality_score: 0,
      raw_data: { notes: notes?.trim() || "" },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create job record" }, { status: 500 });
  }

  // Create a job_match with score 0 in the given status
  const { error: matchError } = await supabase.from("job_matches").insert({
    user_id: user.id,
    job_id: job.id,
    score: 0,
    score_breakdown: {
      title: 0, skills: 0, location: 0, experience: 0,
      recency: 0, sponsor: 0, total: 0,
      explanation: "Manually added application",
    },
    user_status: status,
    status_updated_at: new Date().toISOString(),
  });

  if (matchError) {
    return NextResponse.json({ error: "Failed to create match record" }, { status: 500 });
  }

  // Log interaction
  await supabase.from("user_interactions").insert({
    user_id: user.id,
    job_id: job.id,
    action: "apply",
  });

  return NextResponse.json({ success: true });
}
