"use client";

import type { ApplicationItem } from "@/app/api/applications/route";
import { KANBAN_COLUMNS } from "./kanban-board";

interface ListViewProps {
  applications: ApplicationItem[];
  onSelect: (matchId: string) => void;
}

const statusMeta = Object.fromEntries(
  KANBAN_COLUMNS.map(({ status, label, color }) => [status, { label, color }])
);

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ListView({ applications, onSelect }: ListViewProps) {
  if (applications.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[10px] border border-[#e8e8e8]"
        style={{ minHeight: "300px", background: "#fafafa" }}
      >
        <p style={{ fontSize: "13px", color: "#aaaaaa" }}>No applications yet. Save or apply to jobs to track them here.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#e8e8e8] rounded-[10px] overflow-hidden">
      {/* Table header */}
      <div
        className="grid items-center border-b border-[#e8e8e8] px-4 py-2.5"
        style={{ gridTemplateColumns: "1fr 1fr 120px 60px 120px 120px", background: "#fafafa" }}
      >
        {["Role", "Company", "Status", "Score", "Salary", "Updated"].map((h) => (
          <span key={h} style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {applications.map((item, idx) => {
        const meta = statusMeta[item.userStatus] ?? { label: item.userStatus, color: "#888888" };
        const scoreColor = item.score >= 80 ? "#16a34a" : item.score >= 60 ? "#d97706" : "#888888";
        const salary = formatSalary(item.salaryMin, item.salaryMax);

        return (
          <div
            key={item.matchId}
            className="grid items-center px-4 py-3 cursor-pointer hover:bg-[#f7f8fc] transition-colors"
            style={{
              gridTemplateColumns: "1fr 1fr 120px 60px 120px 120px",
              borderTop: idx > 0 ? "1px solid #f0f0f0" : undefined,
            }}
            onClick={() => onSelect(item.matchId)}
          >
            {/* Role */}
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#111111" }}>
                {item.title}
              </p>
              <div className="flex gap-1.5 mt-0.5">
                {item.isH1bSponsor && (
                  <span style={{ fontSize: "9px", background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: "3px" }}>H1B</span>
                )}
                {item.isEverified && (
                  <span style={{ fontSize: "9px", background: "#dcfce7", color: "#15803d", padding: "1px 5px", borderRadius: "3px" }}>E-Verified</span>
                )}
              </div>
            </div>

            {/* Company */}
            <p className="truncate" style={{ fontSize: "13px", color: "#555555" }}>{item.company}</p>

            {/* Status badge */}
            <span
              className="inline-flex items-center rounded-[4px] px-2 py-0.5 w-fit"
              style={{ fontSize: "11px", fontWeight: 500, color: meta.color, background: `${meta.color}15` }}
            >
              {meta.label}
            </span>

            {/* Score */}
            <span style={{ fontSize: "14px", fontWeight: 700, color: scoreColor }}>{item.score}</span>

            {/* Salary */}
            <span style={{ fontSize: "12px", color: "#888888" }}>{salary ?? "—"}</span>

            {/* Updated */}
            <span style={{ fontSize: "11px", color: "#aaaaaa" }}>{formatDate(item.statusUpdatedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
