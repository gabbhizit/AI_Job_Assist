"use client";

import { useEffect, useState, useCallback } from "react";
import { JobCard } from "@/components/jobs/job-card";
import { FilterBar, DEFAULT_FILTERS } from "@/components/jobs/filter-bar";
import type { JobFilters } from "@/components/jobs/filter-bar";
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
    is_h1b_sponsor: boolean;
    is_everified: boolean;
  };
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);

  const fetchMatches = useCallback(
    async (activeFilters: JobFilters) => {
      const params = new URLSearchParams();
      if (activeFilters.role) params.set("role", activeFilters.role);
      if (activeFilters.h1b_sponsor) params.set("h1b_sponsor", "true");
      if (activeFilters.everified) params.set("everified", "true");
      if (activeFilters.date_posted) params.set("date_posted", activeFilters.date_posted);
      if (activeFilters.job_type) params.set("job_type", activeFilters.job_type);
      if (activeFilters.experience_level) params.set("experience_level", activeFilters.experience_level);

      const [jobsRes, resumeRes] = await Promise.all([
        fetch(`/api/jobs?${params.toString()}`),
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
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchMatches(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query on filter change (local DB query only — no external API calls)
  const handleFilterChange = useCallback(
    (newFilters: JobFilters) => {
      setFilters(newFilters);
      setLoading(true);
      fetchMatches(newFilters).finally(() => setLoading(false));
    },
    [fetchMatches]
  );

  const handleAction = async (jobId: string, action: string) => {
    await fetch(`/api/jobs/${jobId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (action === "save" || action === "dismiss") {
      setMatches((prev) => prev.filter((m) => m.jobs.id !== jobId));
    }
  };

  if (loading && hasResume === null) {
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

  const hasActiveFilters = Object.values(filters).some((v) => v !== "" && v !== false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today&apos;s Top Matches</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {matches.length} job{matches.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <FilterBar filters={filters} onChange={handleFilterChange} />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">
            {hasActiveFilters ? "No jobs match your filters" : "No job matches yet"}
          </p>
          <p className="text-sm">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters."
              : "Jobs are fetched and matched daily. Check back tomorrow, or update your "}
            {!hasActiveFilters && (
              <Link
                href="/dashboard/preferences"
                className="text-primary underline"
              >
                preferences
              </Link>
            )}
            {!hasActiveFilters && " for better results."}
          </p>
        </div>
      ) : (
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
              isH1bSponsor={match.jobs.is_h1b_sponsor}
              isEverified={match.jobs.is_everified}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
