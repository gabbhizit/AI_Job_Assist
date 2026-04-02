"use client";

import { useEffect, useState } from "react";

interface SalaryData {
  company: string;
  title: string;
  min: number;
  max: number;
  mid: number;
}

function formatK(n: number): string {
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

export function SalaryIntel() {
  const [rows, setRows] = useState<SalaryData[]>([]);
  const [overall, setOverall] = useState<{ min: number; median: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const matches: any[] = data.matches || [];
        const withSalary = matches.filter(
          (m) => m.jobs?.salary_min || m.jobs?.salary_max
        );

        if (withSalary.length === 0) {
          setRows([]);
          setOverall(null);
          return;
        }

        // Overall range
        const mins = withSalary.map((m) => m.jobs.salary_min || m.jobs.salary_max);
        const maxs = withSalary.map((m) => m.jobs.salary_max || m.jobs.salary_min);
        const mids = withSalary.map((m) => {
          const min = m.jobs.salary_min || m.jobs.salary_max;
          const max = m.jobs.salary_max || m.jobs.salary_min;
          return Math.round((min + max) / 2);
        });
        mids.sort((a, b) => a - b);
        const median = mids[Math.floor(mids.length / 2)];

        setOverall({
          min: Math.min(...mins),
          median,
          max: Math.max(...maxs),
        });

        // Per-company table (top 10 by mid salary)
        const companyRows: SalaryData[] = withSalary
          .map((m) => {
            const min = m.jobs.salary_min || m.jobs.salary_max;
            const max = m.jobs.salary_max || m.jobs.salary_min;
            return {
              company: m.jobs.company,
              title: m.jobs.title,
              min,
              max,
              mid: Math.round((min + max) / 2),
            };
          })
          .sort((a, b) => b.mid - a.mid)
          .slice(0, 10);

        setRows(companyRows);
      })
      .catch(() => { setRows([]); setOverall(null); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!overall || rows.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[#e0e0e0]"
        style={{ minHeight: "260px" }}
      >
        <p style={{ fontSize: "13px", color: "#aaaaaa" }}>No salary data available yet.</p>
        <p style={{ fontSize: "12px", color: "#cccccc", marginTop: "4px" }}>
          Salary ranges will appear once jobs are matched to your profile.
        </p>
      </div>
    );
  }

  const range = overall.max - overall.min || 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Salary range bar */}
      <div className="border border-[#e8e8e8] rounded-[10px] p-5">
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#333333", marginBottom: "20px" }}>
          Salary range across your {rows.length} top matches
        </p>
        <div className="relative mb-4">
          {/* Track */}
          <div className="h-3 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #6366f1, #16a34a)" }}
            />
          </div>
          {/* Median marker */}
          <div
            className="absolute top-0 w-0.5 h-3 bg-[#111111] rounded-full"
            style={{ left: `${((overall.median - overall.min) / range) * 100}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p style={{ fontSize: "11px", color: "#888888" }}>Min</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#6366f1", letterSpacing: "-0.02em" }}>{formatK(overall.min)}</p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: "11px", color: "#888888" }}>Median</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.02em" }}>{formatK(overall.median)}</p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: "11px", color: "#888888" }}>Max</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a", letterSpacing: "-0.02em" }}>{formatK(overall.max)}</p>
          </div>
        </div>
      </div>

      {/* Per-company table */}
      <div>
        <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
          Top paying matches
        </p>
        <div className="border border-[#e8e8e8] rounded-[10px] overflow-hidden">
          {rows.map((row, i) => {
            const barPct = ((row.mid - overall.min) / range) * 100;
            return (
              <div
                key={i}
                className="flex items-center px-4 py-3 gap-4"
                style={{ borderTop: i > 0 ? "1px solid #f0f0f0" : undefined }}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#111111" }}>{row.company}</p>
                  <p className="truncate" style={{ fontSize: "11px", color: "#888888" }}>{row.title}</p>
                </div>
                <div className="flex items-center gap-3" style={{ width: "180px" }}>
                  <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barPct, 5)}%`, background: "linear-gradient(90deg, #6366f1, #16a34a)" }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#333333", flexShrink: 0 }}>
                    {formatK(row.min)}–{formatK(row.max)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: "11px", color: "#cccccc", textAlign: "center" }}>
        Data from job listings matched to your profile. Actual offers may vary.
      </p>
    </div>
  );
}
