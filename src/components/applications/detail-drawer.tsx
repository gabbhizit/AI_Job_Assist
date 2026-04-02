"use client";

import { ExternalLink } from "lucide-react";
import { Sheet } from "@/components/layout/sheet";
import { KANBAN_COLUMNS } from "./kanban-board";
import type { ApplicationItem } from "@/app/api/applications/route";

interface DetailDrawerProps {
  item: ApplicationItem | null;
  onClose: () => void;
  onStatusChange: (matchId: string, newStatus: string) => void;
}

const SCORE_BARS = [
  { key: "title",      label: "Title match",  color: "#6366f1", max: 25 },
  { key: "skills",     label: "Skills",        color: "#0ea5e9", max: 35 },
  { key: "location",   label: "Location",      color: "#16a34a", max: 15 },
  { key: "experience", label: "Experience",    color: "#d97706", max: 10 },
  { key: "recency",    label: "Recency",       color: "#8b5cf6", max: 10 },
  { key: "sponsor",    label: "H1B boost",     color: "#f59e0b", max:  5 },
] as const;

export function DetailDrawer({ item, onClose, onStatusChange }: DetailDrawerProps) {
  if (!item) return null;

  const scoreColor = item.score >= 80 ? "#16a34a" : item.score >= 60 ? "#d97706" : "#888888";

  const formatSalary = () => {
    const { salaryMin: min, salaryMax: max } = item;
    if (!min && !max) return null;
    const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
    if (min && max) return `${fmt(min)}–${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary();
  const bd = item.scoreBreakdown as unknown as Record<string, number>;

  return (
    <Sheet isOpen={!!item} onClose={onClose} title={item.title} width="440px">
      <div className="px-6 py-4 flex flex-col gap-5">

        {/* Company + meta */}
        <div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#111111" }}>{item.company}</p>
          <p style={{ fontSize: "12px", color: "#888888", marginTop: "3px" }}>
            {item.isRemote ? "Remote" : item.location ?? "Location not specified"}
            {item.jobType ? ` · ${item.jobType}` : ""}
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {item.isH1bSponsor && (
              <span style={{ fontSize: "10px", background: "#dbeafe", color: "#1d4ed8", padding: "2px 7px", borderRadius: "4px" }}>H1B Sponsor</span>
            )}
            {item.isEverified && (
              <span style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d", padding: "2px 7px", borderRadius: "4px" }}>E-Verified</span>
            )}
            {salary && (
              <span style={{ fontSize: "10px", background: "#f5f5f5", color: "#555555", padding: "2px 7px", borderRadius: "4px" }}>{salary}</span>
            )}
          </div>
        </div>

        {/* Match score */}
        <div className="border border-[#e8e8e8] rounded-[8px] p-4">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Match score</p>
            <span style={{ fontSize: "20px", fontWeight: 700, color: scoreColor }}>{item.score}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {SCORE_BARS.map(({ key, label, color, max }) => {
              const val = bd[key] ?? 0;
              const pct = Math.round((val / max) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: "11px", color: "#555555" }}>{label}</span>
                    <span style={{ fontSize: "11px", color: "#888888" }}>{val}/{max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {item.scoreBreakdown?.explanation && (
            <p style={{ fontSize: "11px", color: "#888888", marginTop: "12px", lineHeight: 1.5 }}>
              {item.scoreBreakdown.explanation}
            </p>
          )}
        </div>

        {/* Move to column */}
        <div>
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Move to stage
          </p>
          <div className="flex flex-wrap gap-1.5">
            {KANBAN_COLUMNS.map(({ status, label, color }) => (
              <button
                key={status}
                onClick={() => { onStatusChange(item.matchId, status); onClose(); }}
                className="px-3 py-1.5 rounded-[5px] border transition-all text-left"
                style={{
                  fontSize: "12px",
                  background: item.userStatus === status ? color : "white",
                  color: item.userStatus === status ? "white" : "#555555",
                  borderColor: item.userStatus === status ? color : "#e8e8e8",
                  fontWeight: item.userStatus === status ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Skills */}
        {item.skillsExtracted.length > 0 && (
          <div>
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Skills required
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.skillsExtracted.slice(0, 12).map((skill) => (
                <span
                  key={skill}
                  style={{ fontSize: "11px", color: "#555555", background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px" }}
                >
                  {skill}
                </span>
              ))}
              {item.skillsExtracted.length > 12 && (
                <span style={{ fontSize: "11px", color: "#aaaaaa" }}>+{item.skillsExtracted.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Description excerpt */}
        {item.description && (
          <div>
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Description
            </p>
            <p style={{ fontSize: "12px", color: "#555555", lineHeight: 1.6 }}>
              {item.description.slice(0, 400)}{item.description.length > 400 ? "…" : ""}
            </p>
          </div>
        )}

        {/* Apply CTA */}
        {item.applicationUrl && (
          <a
            href={item.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[7px] text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <ExternalLink size={13} />
            Apply now
          </a>
        )}
      </div>
    </Sheet>
  );
}
