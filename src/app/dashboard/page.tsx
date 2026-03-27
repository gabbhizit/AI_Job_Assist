"use client";

import { useEffect, useState, useCallback } from "react";
import { JobCard } from "@/components/jobs/job-card";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MatchedJob {
  id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    salary_min: number | null;
    salary_max: number | null;
    skills_extracted: string[];
    application_url: string | null;
    posted_at: string | null;
  };
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  const fetchMatches = useCallback(async () => {
    const [jobsRes, resumeRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/resume"),
    ]);

    const jobsData = await jobsRes.json();
    const resumeData = await resumeRes.json();

    setMatches(jobsData.matches || []);
    setHasResume(
      resumeData.resume?.parsing_status === "completed" &&
        resumeData.resume?.parsed_data != null
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleAction = async (jobId: string, action: string) => {
    await fetch(`/api/jobs/${jobId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    // Remove from list if saved or dismissed
    if (action === "save" || action === "dismiss") {
      setMatches((prev) => prev.filter((m) => m.jobs.id !== jobId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Welcome to AI Job Copilot</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Upload your resume to start getting personalized job matches. We
          analyze your skills and experience to find the best opportunities for
          you.
        </p>
        <Link href="/dashboard/resume">
          <Button size="lg">Upload Resume</Button>
        </Link>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Today&apos;s Top Matches</h1>
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No job matches yet</p>
          <p className="text-sm">
            Jobs are fetched and matched daily. Check back tomorrow, or update
            your{" "}
            <Link
              href="/dashboard/preferences"
              className="text-primary underline"
            >
              preferences
            </Link>{" "}
            for better results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today&apos;s Top Matches</h1>
        <span className="text-sm text-muted-foreground">
          {matches.length} job{matches.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-4">
        {matches.map((match) => (
          <JobCard
            key={match.id}
            matchId={match.id}
            jobId={match.jobs.id}
            title={match.jobs.title}
            company={match.jobs.company}
            location={match.jobs.location}
            isRemote={match.jobs.is_remote}
            salaryMin={match.jobs.salary_min}
            salaryMax={match.jobs.salary_max}
            score={match.score}
            scoreBreakdown={match.score_breakdown}
            skills={match.jobs.skills_extracted}
            applicationUrl={match.jobs.application_url}
            postedAt={match.jobs.posted_at}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}
