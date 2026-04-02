"use client";

import { useEffect, useState } from "react";
import type { ApplicationStats } from "@/app/api/applications/route";

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

export function AnalyticsTab() {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => setStats(data.stats ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalApplied === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#e0e0e0]"
        style={{ minHeight: "300px" }}
      >
        <p style={{ fontSize: "13px", color: "#aaaaaa" }}>No application data yet.</p>
        <p style={{ fontSize: "12px", color: "#cccccc", marginTop: "4px" }}>
          Start applying to jobs to see your pipeline analytics.
        </p>
      </div>
    );
  }

  const stages: FunnelStage[] = [
    { label: "Applied",      count: stats.totalApplied,   color: "#6366f1" },
    { label: "Phone Screen", count: Math.round(stats.totalApplied * (stats.responseRate / 100)), color: "#0ea5e9" },
    { label: "Interview",    count: stats.interviewCount,  color: "#d97706" },
    { label: "Offer",        count: stats.offerCount,      color: "#16a34a" },
  ];

  const maxCount = stages[0].count || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Applied",      value: stats.totalApplied,          color: "#6366f1" },
          { label: "Response rate", value: `${stats.responseRate}%`,    color: "#0ea5e9" },
          { label: "Interviews",   value: stats.interviewCount,         color: "#d97706" },
          { label: "Offers",       value: stats.offerCount,             color: "#16a34a" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-[10px] border border-[#e8e8e8] px-4 py-3"
            style={{ background: `${color}08` }}
          >
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              {label}
            </p>
            <p style={{ fontSize: "22px", fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Funnel chart */}
      <div className="border border-[#e8e8e8] rounded-[10px] p-5">
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#333333", marginBottom: "20px" }}>
          Application funnel
        </p>
        <div className="flex flex-col gap-3">
          {stages.map((stage, i) => {
            const pct = Math.max(0, (stage.count / maxCount) * 100);
            const convRate =
              i > 0 && stages[i - 1].count > 0
                ? Math.round((stage.count / stages[i - 1].count) * 100)
                : null;

            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#333333" }}>{stage.label}</span>
                    {convRate !== null && (
                      <span style={{ fontSize: "11px", color: "#aaaaaa" }}>
                        ({convRate}% from prev)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: stage.color }}>{stage.count}</span>
                </div>
                <div className="h-8 bg-[#f5f5f5] rounded-[6px] overflow-hidden relative">
                  <div
                    className="h-full rounded-[6px] transition-all duration-700 flex items-center justify-end pr-3"
                    style={{ width: `${Math.max(pct, 4)}%`, background: `${stage.color}cc` }}
                  >
                    {pct > 15 && (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "white" }}>
                        {Math.round(pct)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips based on funnel */}
      <div className="border border-[#e8e8e8] rounded-[10px] p-4">
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#333333", marginBottom: "10px" }}>Coaching insights</p>
        <div className="flex flex-col gap-2">
          {stats.responseRate < 10 && stats.totalApplied >= 10 && (
            <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.5 }}>
              📊 Your response rate is below 10%. Try tailoring your resume more to each job description and focus on H1B-sponsoring companies.
            </p>
          )}
          {stats.responseRate >= 10 && stats.interviewCount === 0 && (
            <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.5 }}>
              📞 You&apos;re getting callbacks but no interview invites. Work on your phone screen answers — especially the visa sponsorship question.
            </p>
          )}
          {stats.interviewCount > 0 && stats.offerCount === 0 && (
            <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.5 }}>
              🎯 You&apos;re reaching interviews — great signal! Use the Interview Prep tab to sharpen your technical and behavioural responses.
            </p>
          )}
          {stats.offerCount > 0 && (
            <p style={{ fontSize: "12px", color: "#16a34a", lineHeight: 1.5 }}>
              🎉 You have {stats.offerCount} offer{stats.offerCount > 1 ? "s" : ""}! Ask the Coach about salary negotiation strategies.
            </p>
          )}
          {stats.totalApplied < 10 && (
            <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.5 }}>
              🚀 Apply to more jobs to get meaningful funnel data. Aim for at least 20–30 applications before drawing conclusions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
