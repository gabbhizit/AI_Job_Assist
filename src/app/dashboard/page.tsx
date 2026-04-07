"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Building2, Zap, Lock, ArrowRight, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MatchedJob {
  id: string;
  score: number;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    salary_min: number | null;
    salary_max: number | null;
    is_h1b_sponsor: boolean;
    is_everified: boolean;
    application_url: string | null;
  };
}

// ── ScoreChip (ported from Figma Dashboard.tsx) ───────────────────────────────
function ScoreChip({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 65 ? "#d97706" : "#dc2626";
  return (
    <span style={{
      fontSize: "12px", color, background: `${color}12`,
      padding: "2px 8px", borderRadius: "5px", lineHeight: "18px",
      display: "inline-block", fontWeight: 500,
    }}>
      {score}%
    </span>
  );
}

// ── VisaBadge (ported from Figma Dashboard.tsx) ───────────────────────────────
function VisaBadge({ status }: { status: boolean | null }) {
  if (status === true)
    return (
      <span style={{
        fontSize: "11px", color: "#16a34a", background: "#16a34a10",
        padding: "1px 6px", borderRadius: "4px", border: "1px solid #16a34a20",
      }}>
        H1B ✓
      </span>
    );
  if (status === false)
    return (
      <span style={{
        fontSize: "11px", color: "#dc2626", background: "#dc262610",
        padding: "1px 6px", borderRadius: "4px", border: "1px solid #dc262620",
      }}>
        No history
      </span>
    );
  return (
    <span style={{
      fontSize: "11px", color: "#aaaaaa", background: "#f5f5f5",
      padding: "1px 6px", borderRadius: "4px", border: "1px solid #e8e8e8",
    }}>
      Unknown
    </span>
  );
}

// ── HealthGauge (ported from Figma Dashboard.tsx) ────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const r = 52;
  const circ = Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 14 70 A 56 56 0 0 1 126 70" fill="none" stroke="#f0f0f0" strokeWidth="9" strokeLinecap="round" />
        <path d="M 14 70 A 56 56 0 0 1 126 70" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} />
        <text x="70" y="60" textAnchor="middle" fill="#111111" fontSize="24" fontWeight="600">{score}</text>
        <text x="70" y="74" textAnchor="middle" fill="#aaaaaa" fontSize="10">/ 100</text>
      </svg>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── OPT Countdown ────────────────────────────────────────────────────────────
function OPTCountdown({ optEndDate, loading }: { optEndDate: string | null; loading: boolean }) {
  const containerStyle = {
    background: "linear-gradient(135deg, rgba(217,119,6,0.08), rgba(245,158,11,0.04))",
    border: "1px solid rgba(217,119,6,0.2)",
  };

  if (loading) {
    return (
      <div className="rounded-[10px] p-5 shadow-sm flex flex-col" style={containerStyle}>
        <p style={{ fontSize: "11px", color: "#d97706", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 500 }}>
          OPT Countdown
        </p>
        <div className="flex flex-col items-center justify-center flex-1 py-4">
          <div className="h-4 w-4 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!optEndDate) {
    return (
      <div className="rounded-[10px] p-5 shadow-sm flex flex-col" style={containerStyle}>
        <p style={{ fontSize: "11px", color: "#d97706", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 500 }}>
          OPT Countdown
        </p>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-4">
          <Lock size={22} color="#d97706" strokeWidth={1.5} style={{ opacity: 0.5 }} />
          <p style={{ fontSize: "12px", color: "#aaaaaa", textAlign: "center", lineHeight: 1.6 }}>
            Add your OPT end date in your profile to enable countdown tracking
          </p>
        </div>
      </div>
    );
  }

  const endMs = new Date(optEndDate + "T00:00:00").getTime();
  const daysLeft = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft < 0;
  const urgent = daysLeft >= 0 && daysLeft <= 30;
  const warning = daysLeft > 30 && daysLeft <= 90;

  const accentColor = expired ? "#dc2626" : urgent ? "#dc2626" : warning ? "#d97706" : "#16a34a";
  const label = expired
    ? "OPT expired"
    : urgent
    ? "Urgent — act now"
    : warning
    ? "Running low"
    : "You have time";

  const formattedDate = new Date(optEndDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="rounded-[10px] p-5 shadow-sm flex flex-col" style={containerStyle}>
      <p style={{ fontSize: "11px", color: "#d97706", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 500 }}>
        OPT Countdown
      </p>
      <div className="flex flex-col items-center justify-center flex-1 gap-2 py-2">
        <Clock size={20} color={accentColor} strokeWidth={1.5} style={{ opacity: 0.8 }} />
        <p style={{ fontSize: "48px", fontWeight: 700, color: accentColor, lineHeight: 1, letterSpacing: "-0.04em" }}>
          {expired ? "0" : daysLeft}
        </p>
        <p style={{ fontSize: "13px", color: "#555555", fontWeight: 500 }}>
          {expired ? "days (expired)" : "days remaining"}
        </p>
        <span style={{
          fontSize: "10px", color: accentColor, background: `${accentColor}12`,
          padding: "2px 8px", borderRadius: "4px", fontWeight: 500,
        }}>
          {label}
        </span>
        <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "4px" }}>
          Expires {formattedDate}
        </p>
      </div>
    </div>
  );
}

// ── Stat card configs (exact from Figma statConfigs) ─────────────────────────
const statConfigs = [
  { label: "Applied this week",  gradient: "from-[#6366f1]/8 to-[#6366f1]/3",  accent: "#6366f1" },
  { label: "Interviews pending", gradient: "from-[#8b5cf6]/8 to-[#8b5cf6]/3",  accent: "#8b5cf6" },
  { label: "In review",          gradient: "from-[#d97706]/8 to-[#d97706]/3",   accent: "#d97706" },
  { label: "Avg match rate",     gradient: "from-[#16a34a]/8 to-[#16a34a]/3",   accent: "#16a34a" },
];

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  // Real data
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [userName, setUserName] = useState("there");
  const [weekNum, setWeekNum] = useState<number | null>(null);
  const [optEndDate, setOptEndDate] = useState<string | null>(null);
  const [appStats, setAppStats] = useState<{
    appliedThisWeek: number;
    interviewCount: number;
    phoneScreenCount: number;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // User name
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email ?? "";
      const raw = email.split("@")[0]?.split(".")[0] ?? "there";
      setUserName(raw.charAt(0).toUpperCase() + raw.slice(1));

      // Parallel API calls
      const [jobsRes, savedRes, resumeRes, profileRes, appsRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/jobs/saved"),
        fetch("/api/resume"),
        fetch("/api/profile"),
        fetch("/api/applications"),
      ]);

      const [jobsData, savedData, resumeData, profileData, appsData] = await Promise.all([
        jobsRes.json(),
        savedRes.json(),
        resumeRes.json(),
        profileRes.json(),
        appsRes.json(),
      ]);

      setMatches(jobsData.matches || []);
      setSavedCount(savedData.jobs?.length || 0);
      setHasResume(
        resumeData.resume?.parsing_status === "completed" &&
          resumeData.resume?.parsed_data != null
      );

      // Application tracking stats
      if (appsData.stats) {
        setAppStats({
          appliedThisWeek: appsData.stats.appliedThisWeek,
          interviewCount: appsData.stats.interviewCount,
          phoneScreenCount: appsData.stats.phoneScreenCount,
        });
      }

      // Week counter from profile created_at
      const createdAt = profileData.profile?.created_at;
      if (createdAt) {
        const weeks = Math.ceil(
          (Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        setWeekNum(Math.max(1, weeks));
      }

      // OPT end date
      setOptEndDate(profileData.profile?.opt_end_date ?? null);

      setLoading(false);
    }

    loadData();
  }, []);

  // Computed stats
  const avgMatch =
    matches.length > 0
      ? Math.round(matches.reduce((s, m) => s + m.score, 0) / matches.length)
      : 0;
  const healthScore = Math.min(100, Math.round(45 + avgMatch * 0.55));
  const topJobs = matches.slice(0, 5);

  const stats = [
    {
      value: appStats ? String(appStats.appliedThisWeek) : "—",
      change: appStats
        ? appStats.appliedThisWeek === 1 ? "application this week" : "applications this week"
        : "loading…",
    },
    {
      value: appStats ? String(appStats.interviewCount) : "—",
      change: appStats
        ? appStats.interviewCount === 1 ? "interview scheduled" : "interviews scheduled"
        : "loading…",
    },
    {
      value: appStats ? String(appStats.phoneScreenCount) : "—",
      change: appStats
        ? appStats.phoneScreenCount === 1 ? "at phone screen stage" : "at phone screen stage"
        : "loading…",
    },
    { value: `${avgMatch}%`, change: `from ${matches.length} matched jobs` },
  ];

  // ── No resume state ──────────────────────────────────────────────────────────
  if (!loading && !hasResume) {
    return (
      <div className="px-8 py-7">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#111111", letterSpacing: "-0.03em" }}>
            Welcome to OfferPath 👋
          </h1>
          <p className="mb-6 max-w-md mx-auto" style={{ color: "#888888", fontSize: "14px" }}>
            Upload your resume to start getting personalised job matches. We analyse your skills and
            experience to find the best H1B-friendly opportunities.
          </p>
          <Link
            href="/dashboard/resume"
            className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Upload Resume →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-7" style={{ maxWidth: "1100px" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <h1 style={{ color: "#111111", letterSpacing: "-0.03em", fontSize: "24px", fontWeight: 700 }}>
          Good morning, {loading ? "…" : userName} 👋
        </h1>
        <p style={{ fontSize: "13px", color: "#aaaaaa", marginTop: "3px" }}>
          {formatDate()}{weekNum ? ` · Week ${weekNum} of your job search` : ""}
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {stats.map((s, i) => {
          const cfg = statConfigs[i];
          return (
            <div
              key={cfg.label}
              className={`bg-gradient-to-br ${cfg.gradient} rounded-[10px] p-5`}
              style={{ borderWidth: "1px", borderStyle: "solid", borderColor: `${cfg.accent}20` }}
            >
              <p style={{ fontSize: "11px", color: "#888888", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {cfg.label}
              </p>
              <p style={{ fontSize: "26px", color: "#111111", lineHeight: 1.1, marginTop: "6px", letterSpacing: "-0.04em", fontWeight: 700 }}>
                {loading ? "…" : s.value}
              </p>
              <p style={{ fontSize: "12px", color: cfg.accent, marginTop: "6px" }}>
                {s.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Row 1: Health Score + OPT Countdown ────────────────────────────── */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 290px" }}>

        {/* Health Score */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 shadow-sm">
          <p style={{ fontSize: "11px", color: "#aaaaaa", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "16px" }}>
            Search Health Score
          </p>
          <div className="flex items-center gap-8">
            <HealthGauge score={loading ? 0 : healthScore} />
            <div className="flex-1">
              <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.7 }}>
                Your score is{" "}
                <span style={{ color: "#111111", fontWeight: 600 }}>{loading ? "…" : healthScore}</span>.
                {" "}Derived from your avg match quality. Keep your preferences up-to-date to improve results.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Profile",  val: "84%", w: "84%", c: "#16a34a" },
                  { label: "Volume",   val: "80%", w: "80%", c: "#6366f1" },
                  { label: "Quality",  val: loading ? "—" : `${Math.round(avgMatch * 0.8)}%`, w: loading ? "0%" : `${Math.round(avgMatch * 0.8)}%`, c: "#d97706" },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="flex justify-between mb-1.5">
                      <span style={{ fontSize: "11px", color: "#aaaaaa" }}>{f.label}</span>
                      <span style={{ fontSize: "11px", color: "#555555", fontWeight: 500 }}>{f.val}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: f.w, background: f.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* OPT Countdown */}
        <OPTCountdown optEndDate={optEndDate} loading={loading} />
      </div>

      {/* ── Row 2: Top Jobs + Right Panel ──────────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 330px" }}>

        {/* Top Matched Jobs */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
            <p style={{ fontSize: "11px", color: "#aaaaaa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Top Matched Jobs Today
            </p>
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1 transition-colors hover:text-[#6366f1]"
              style={{ fontSize: "12px", color: "#aaaaaa" }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topJobs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              {hasResume ? (
                <>
                  <p style={{ fontSize: "13px", color: "#aaaaaa" }}>No jobs above your match threshold.</p>
                  <p style={{ fontSize: "12px", color: "#aaaaaa", marginTop: "4px", lineHeight: 1.6 }}>
                    Try lowering your min score in{" "}
                    <span style={{ color: "#555555", fontWeight: 500 }}>Settings</span>
                    {" "}(bottom of sidebar), or wait for the next daily pipeline run.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "13px", color: "#aaaaaa" }}>No job matches yet.</p>
                  <Link href="/dashboard/resume" style={{ fontSize: "12px", color: "#6366f1" }} className="underline mt-1 inline-block">
                    Upload your resume to get started
                  </Link>
                </>
              )}
            </div>
          ) : (
            topJobs.map((match, i) => (
              <div
                key={match.id}
                onClick={() => router.push("/dashboard/jobs")}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-[#fafafa] transition-colors cursor-pointer ${i < topJobs.length - 1 ? "border-b border-[#f8f8f8]" : ""}`}
              >
                {/* Company logo placeholder */}
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded-[8px] border border-[#e8e8e8] shadow-sm"
                  style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #f5f5f5, #e8e8e8)" }}
                >
                  <Building2 size={15} color="#aaaaaa" />
                </div>

                {/* Title + company */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "13px", color: "#111111" }}>{match.jobs.title}</p>
                  <p style={{ fontSize: "12px", color: "#aaaaaa", marginTop: "2px" }}>
                    {match.jobs.company}
                    {match.jobs.location ? ` · ${match.jobs.location}` : ""}
                    {match.jobs.is_remote && !match.jobs.location ? " · Remote" : ""}
                    {match.jobs.is_remote && match.jobs.location ? " · Remote" : ""}
                  </p>
                </div>

                {/* Badges + score */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <VisaBadge status={match.jobs.is_h1b_sponsor ? true : null} />
                  <ScoreChip score={match.score} />
                </div>

                {/* Salary */}
                <span style={{ fontSize: "12px", color: "#cccccc", flexShrink: 0 }}>
                  {formatSalary(match.jobs.salary_min, match.jobs.salary_max)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Right panel — Coming Soon */}
        <div className="flex flex-col gap-4">
          {/* Today's Actions */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center gap-2">
              <Zap size={13} color="#6366f1" />
              <p style={{ fontSize: "11px", color: "#aaaaaa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Today&apos;s Actions
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 gap-3 px-5">
              <Zap size={20} color="#6366f1" strokeWidth={1.5} style={{ opacity: 0.35 }} />
              <p style={{ fontSize: "12px", color: "#aaaaaa", textAlign: "center", lineHeight: 1.6 }}>
                AI-generated daily nudges based on your activity and OPT timeline
              </p>
              <span style={{
                fontSize: "10px", background: "#f0f0f0", color: "#aaaaaa",
                padding: "2px 8px", borderRadius: "4px", fontWeight: 500, letterSpacing: "0.02em",
              }}>
                Coming Soon
              </span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
              <p style={{ fontSize: "11px", color: "#aaaaaa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Recent Activity
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 gap-3 px-5">
              <Lock size={18} color="#aaaaaa" strokeWidth={1.5} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: "12px", color: "#aaaaaa", textAlign: "center", lineHeight: 1.6 }}>
                Application activity timeline coming soon
              </p>
              <span style={{
                fontSize: "10px", background: "#f0f0f0", color: "#aaaaaa",
                padding: "2px 8px", borderRadius: "4px", fontWeight: 500, letterSpacing: "0.02em",
              }}>
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
