import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ScoreBreakdown } from "@/lib/supabase/types";

export interface ApplicationItem {
  matchId: string;
  jobId: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  userStatus: string;
  statusUpdatedAt: string | null;
  matchDate: string;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null;
  experienceLevel: string | null;
  skillsExtracted: string[];
  applicationUrl: string | null;
  postedAt: string | null;
  isH1bSponsor: boolean;
  isEverified: boolean;
  description: string | null;
}

export interface ApplicationStats {
  totalApplied: number;
  responseRate: number;
  interviewCount: number;
  offerCount: number;
  avgMatchScore: number;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("job_matches")
    .select(`
      id,
      score,
      score_breakdown,
      match_date,
      user_status,
      status_updated_at,
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
        is_h1b_sponsor,
        is_everified,
        description
      )
    `)
    .eq("user_id", user.id)
    .not("user_status", "is", null)
    .neq("user_status", "dismissed")
    .order("status_updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }

  const applications: ApplicationItem[] = (rows || []).map((row: any) => {
    const job = row.jobs;
    return {
      matchId: row.id,
      jobId: row.job_id,
      score: row.score,
      scoreBreakdown: row.score_breakdown as ScoreBreakdown,
      userStatus: row.user_status,
      statusUpdatedAt: row.status_updated_at,
      matchDate: row.match_date,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.is_remote ?? false,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      jobType: job.job_type,
      experienceLevel: job.experience_level,
      skillsExtracted: job.skills_extracted ?? [],
      applicationUrl: job.application_url,
      postedAt: job.posted_at,
      isH1bSponsor: job.is_h1b_sponsor ?? false,
      isEverified: job.is_everified ?? false,
      description: job.description,
    };
  });

  // Compute stats
  const applied = applications.filter((a) => a.userStatus === "applied").length;
  const phoneScreen = applications.filter((a) => a.userStatus === "phone_screen").length;
  const interview = applications.filter((a) => a.userStatus === "interview").length;
  const offer = applications.filter((a) => a.userStatus === "offer").length;
  const rejected = applications.filter((a) => a.userStatus === "rejected").length;
  const responded = phoneScreen + interview + offer + rejected;
  const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;
  const avgMatchScore =
    applications.length > 0
      ? Math.round(applications.reduce((s, a) => s + a.score, 0) / applications.length)
      : 0;

  const stats: ApplicationStats = {
    totalApplied: applied,
    responseRate,
    interviewCount: interview,
    offerCount: offer,
    avgMatchScore,
  };

  return NextResponse.json({ applications, stats });
}
