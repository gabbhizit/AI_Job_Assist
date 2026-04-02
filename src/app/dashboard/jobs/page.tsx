"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import { JobListItem, type MatchedJob } from "@/components/jobs/job-list-item";
import { JobDetailPanel } from "@/components/jobs/job-detail-panel";
import { ShareModal } from "@/components/jobs/share-modal";
import { ReportModal } from "@/components/jobs/report-modal";

type Tab = "foryou" | "saved";

// ─── Sort dropdown ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: "score", label: "Best match" },
  { key: "recent", label: "Most recent" },
  { key: "salary", label: "Highest salary" },
];

// ─── Normalise API rows → MatchedJob ──────────────────────────────────────────
function normaliseForYou(row: any): MatchedJob {
  const job = row.jobs;
  return {
    matchId: row.id,
    jobId: job.id,
    score: row.score,
    scoreBreakdown: row.score_breakdown as ScoreBreakdown,
    userStatus: row.user_status,
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
    description: job.description ?? null,
  };
}

function normaliseSaved(row: any): MatchedJob {
  const job = row.jobs;
  return {
    matchId: row.id,
    jobId: job.id,
    score: row.score,
    scoreBreakdown: row.score_breakdown as ScoreBreakdown,
    userStatus: "saved",
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
    description: job.description ?? null,
  };
}

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>("foryou");
  const [forYouJobs, setForYouJobs] = useState<MatchedJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<MatchedJob[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters / search / sort
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [showSort, setShowSort] = useState(false);
  const [h1bOnly, setH1bOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);

  // Modals
  const [sharingJob, setSharingJob] = useState<MatchedJob | null>(null);
  const [reportingJob, setReportingJob] = useState<MatchedJob | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [forYouRes, savedRes, resumeRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/jobs/saved"),
        fetch("/api/resume"),
      ]);
      const forYouData = await forYouRes.json();
      const savedData = await savedRes.json();
      const resumeData = await resumeRes.json();

      const fy: MatchedJob[] = (forYouData.matches ?? []).map(normaliseForYou);
      const sv: MatchedJob[] = (savedData.matches ?? []).map(normaliseSaved);

      setForYouJobs(fy);
      setSavedJobs(sv);
      setHasResume(
        resumeData.resume?.parsing_status === "completed" &&
          resumeData.resume?.parsed_data != null
      );
      setUserSkills(resumeData.resume?.parsed_data?.skills_flat ?? []);

      // Auto-select first job
      const firstList = fy.length > 0 ? fy : sv;
      if (firstList.length > 0 && !selectedId) {
        setSelectedId(firstList[0].jobId);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const baseList = tab === "foryou" ? forYouJobs : savedJobs;

  const visibleJobs = useMemo(() => {
    let jobs = [...baseList];
    const q = searchQuery.toLowerCase();
    if (q) {
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skillsExtracted.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (h1bOnly) jobs = jobs.filter((j) => j.isH1bSponsor);
    if (remoteOnly) jobs = jobs.filter((j) => j.isRemote);
    if (minScore > 0) jobs = jobs.filter((j) => j.score >= minScore);

    if (sortBy === "score") jobs.sort((a, b) => b.score - a.score);
    else if (sortBy === "recent")
      jobs.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
    else
      jobs.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));

    return jobs;
  }, [baseList, searchQuery, h1bOnly, remoteOnly, minScore, sortBy]);

  const selectedJob = useMemo(
    () => [...forYouJobs, ...savedJobs].find((j) => j.jobId === selectedId) ?? null,
    [forYouJobs, savedJobs, selectedId]
  );

  const savedJobIds = useMemo(() => savedJobs.map((j) => j.jobId), [savedJobs]);

  const hasActiveFilters = h1bOnly || remoteOnly || minScore > 0;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (jobId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const isSaved = savedJobIds.includes(jobId);
      const action = isSaved ? "unsave" : "save";

      // Optimistic
      if (isSaved) {
        setSavedJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      } else {
        const job = [...forYouJobs, ...savedJobs].find((j) => j.jobId === jobId);
        if (job) setSavedJobs((prev) => [...prev, { ...job, userStatus: "saved" }]);
      }

      await fetch(`/api/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    },
    [savedJobIds, forYouJobs, savedJobs]
  );

  const handleApply = useCallback(
    async (job: MatchedJob) => {
      if (job.applicationUrl) window.open(job.applicationUrl, "_blank");

      // Mark as applied — optimistic remove from For You
      setForYouJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
      setSavedJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));

      // Move selectedId to next job
      const remaining = visibleJobs.filter((j) => j.jobId !== job.jobId);
      if (remaining.length > 0) setSelectedId(remaining[0].jobId);

      await fetch(`/api/jobs/${job.jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
    },
    [visibleJobs]
  );

  const handleSkip = useCallback(
    async (job: MatchedJob) => {
      setForYouJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
      const remaining = visibleJobs.filter((j) => j.jobId !== job.jobId);
      if (remaining.length > 0) setSelectedId(remaining[0].jobId);

      await fetch(`/api/jobs/${job.jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
    },
    [visibleJobs]
  );

  // ── No resume state ─────────────────────────────────────────────────────────
  if (!loading && hasResume === false) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-16">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: "#111111", letterSpacing: "-0.03em" }}
          >
            Welcome to OfferPath
          </h1>
          <p className="mb-6 max-w-md mx-auto" style={{ color: "#888888", fontSize: "14px" }}>
            Upload your resume to start getting personalised job matches based on your skills and
            experience.
          </p>
          <Link href="/dashboard/resume">
            <Button size="lg" style={{ background: "#6366f1" }}>
              Upload Resume
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Split panel ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col h-full border-r border-[#e8e8e8] bg-white"
        style={{ width: "380px", minWidth: "380px" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#e8e8e8]">
          <div className="flex items-center justify-between mb-3">
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.03em",
              }}
            >
              Jobs
            </h1>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-[6px] transition-all ${
                showFilters
                  ? "border-[#6366f1]/30 text-[#6366f1] bg-[#6366f1]/5"
                  : "border-[#e8e8e8] text-[#888888] hover:border-[#d0d0d0]"
              }`}
              style={{ fontSize: "12px" }}
            >
              <SlidersHorizontal size={12} />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] inline-block" />
              )}
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-[#f8f8f8] border border-[#e8e8e8] rounded-[8px] px-3 py-2 mb-3 focus-within:border-[#6366f1]/40 focus-within:bg-white transition-all">
            <Search size={13} color="#aaaaaa" />
            <input
              className="flex-1 bg-transparent outline-none text-[#111111] placeholder-[#cccccc]"
              style={{ fontSize: "13px" }}
              placeholder="Search roles, companies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X size={12} color="#aaaaaa" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {(["foryou", "saved"] as Tab[]).map((t) => {
              const label = t === "foryou" ? "For You" : "Saved";
              const count = t === "saved" ? savedJobs.length : null;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    const list = t === "foryou" ? forYouJobs : savedJobs;
                    if (list.length > 0) setSelectedId(list[0].jobId);
                  }}
                  className="pb-2.5 mr-5 transition-colors relative"
                  style={{
                    fontSize: "13px",
                    color: tab === t ? "#111111" : "#aaaaaa",
                    fontWeight: tab === t ? 500 : 400,
                  }}
                >
                  {label}
                  {count !== null && count > 0 && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#6366f1",
                        background: "#6366f115",
                        padding: "0px 5px",
                        borderRadius: "8px",
                        marginLeft: "4px",
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {tab === t && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6366f1] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="border-b border-[#e8e8e8] px-5 py-4 bg-[#fafafa]">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "#aaaaaa",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  Sponsorship
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "H1B", active: h1bOnly, toggle: () => setH1bOnly((v) => !v) },
                  ].map((f) => (
                    <button
                      key={f.label}
                      onClick={f.toggle}
                      className={`px-2 py-1 border rounded-[4px] transition-all ${
                        f.active
                          ? "border-[#6366f1]/30 text-[#6366f1] bg-[#6366f1]/8"
                          : "border-[#e8e8e8] text-[#888888] hover:border-[#d0d0d0]"
                      }`}
                      style={{ fontSize: "11px" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "#aaaaaa",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  Work type
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Remote", active: remoteOnly, toggle: () => setRemoteOnly((v) => !v) },
                  ].map((f) => (
                    <button
                      key={f.label}
                      onClick={f.toggle}
                      className={`px-2 py-1 border rounded-[4px] transition-all ${
                        f.active
                          ? "border-[#6366f1]/30 text-[#6366f1] bg-[#6366f1]/8"
                          : "border-[#e8e8e8] text-[#888888] hover:border-[#d0d0d0]"
                      }`}
                      style={{ fontSize: "11px" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Min score slider */}
            <div>
              <div className="flex justify-between mb-1.5">
                <p
                  style={{
                    fontSize: "10px",
                    color: "#aaaaaa",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Min match score
                </p>
                <span
                  style={{
                    fontSize: "11px",
                    color: minScore > 0 ? "#6366f1" : "#aaaaaa",
                    fontWeight: minScore > 0 ? 500 : 400,
                  }}
                >
                  {minScore > 0 ? `${minScore}%+` : "Any"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(+e.target.value)}
                className="w-full accent-[#6366f1]"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setH1bOnly(false);
                  setRemoteOnly(false);
                  setMinScore(0);
                }}
                className="mt-2 text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                style={{ fontSize: "11px" }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Sort bar */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-[#f5f5f5] bg-[#fafafa] relative">
          <p style={{ fontSize: "11px", color: "#cccccc" }}>
            {visibleJobs.length} role{visibleJobs.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowSort((v) => !v)}
            className="flex items-center gap-1 text-[#888888] hover:text-[#555] transition-colors"
            style={{ fontSize: "11px" }}
          >
            {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
            <ChevronDown size={11} />
          </button>
          {showSort && (
            <div className="absolute right-4 top-9 bg-white border border-[#e8e8e8] rounded-[8px] shadow-lg z-10 overflow-hidden w-[160px]">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setSortBy(s.key);
                    setShowSort(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-[#f5f5f5] transition-colors"
                  style={{
                    fontSize: "12px",
                    color: sortBy === s.key ? "#6366f1" : "#555555",
                    fontWeight: sortBy === s.key ? 500 : 400,
                  }}
                >
                  {sortBy === s.key && <Check size={11} />}
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {visibleJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-5">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                <Search size={18} color="#cccccc" />
              </div>
              <p style={{ fontSize: "13px", color: "#aaaaaa" }}>
                {tab === "saved" ? "No saved jobs yet" : "No jobs match your filters"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setH1bOnly(false);
                    setRemoteOnly(false);
                    setMinScore(0);
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 border border-[#e8e8e8] rounded-[6px] text-[#555555] hover:bg-[#f5f5f5] transition-colors"
                  style={{ fontSize: "12px" }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            visibleJobs.map((job) => (
              <JobListItem
                key={job.matchId}
                job={job}
                isActive={selectedId === job.jobId}
                isSaved={savedJobIds.includes(job.jobId)}
                isApplied={job.userStatus === "applied"}
                onSelect={() => setSelectedId(job.jobId)}
                onSave={(e) => handleSave(job.jobId, e)}
                onQuickApply={(e) => {
                  e.stopPropagation();
                  setSelectedId(job.jobId);
                  handleApply(job);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full overflow-hidden">
        {selectedJob ? (
          <JobDetailPanel
            job={selectedJob}
            userSkills={userSkills}
            isSaved={savedJobIds.includes(selectedJob.jobId)}
            isApplied={selectedJob.userStatus === "applied"}
            onSave={() => handleSave(selectedJob.jobId)}
            onApply={() => handleApply(selectedJob)}
            onSkip={() => handleSkip(selectedJob)}
            onShare={() => setSharingJob(selectedJob)}
            onReport={() => setReportingJob(selectedJob)}
          />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ background: "#f7f8fc" }}>
            <div className="text-center">
              <p style={{ fontSize: "14px", color: "#aaaaaa" }}>Select a job to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {sharingJob && (
        <ShareModal
          jobTitle={sharingJob.title}
          company={sharingJob.company}
          applicationUrl={sharingJob.applicationUrl}
          onClose={() => setSharingJob(null)}
        />
      )}
      {reportingJob && (
        <ReportModal
          jobTitle={reportingJob.title}
          company={reportingJob.company}
          onClose={() => setReportingJob(null)}
        />
      )}
    </div>
  );
}
