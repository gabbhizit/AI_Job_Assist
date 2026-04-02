"use client";

import { useEffect, useState } from "react";
import type { ParsedResume } from "@/lib/supabase/types";

interface SkillsGapProps {
  resume: ParsedResume;
}

interface SkillEntry {
  skill: string;
  count: number;
  have: boolean;
}

export function SkillsGap({ resume }: SkillsGapProps) {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const matches: any[] = data.matches || [];
        const userSet = new Set(
          (resume.skills_flat ?? []).map((s) => s.toLowerCase())
        );

        const freq: Record<string, number> = {};
        for (const match of matches) {
          for (const skill of match.jobs?.skills_extracted ?? []) {
            const key = skill.toLowerCase();
            freq[key] = (freq[key] ?? 0) + 1;
          }
        }

        const rows: SkillEntry[] = Object.entries(freq)
          .filter(([, count]) => count >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 30)
          .map(([skill, count]) => ({
            skill,
            count,
            have: userSet.has(skill),
          }));

        setSkills(rows);
      })
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [resume]);

  if (loading) {
    return (
      <div className="border border-[#e8e8e8] rounded-[12px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>Skills Gap</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="border border-[#e8e8e8] rounded-[12px] p-5">
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111", marginBottom: "8px" }}>Skills Gap</p>
        <p style={{ fontSize: "12px", color: "#aaaaaa" }}>
          No job match data yet. Run the pipeline to see which skills are most in-demand.
        </p>
      </div>
    );
  }

  const missing = skills.filter((s) => !s.have);
  const have = skills.filter((s) => s.have);
  const maxCount = skills[0]?.count || 1;
  const visibleMissing = showAll ? missing : missing.slice(0, 8);

  return (
    <div className="border border-[#e8e8e8] rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>Skills Gap</p>
          <p style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
            Based on skills required across your matched jobs
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex gap-2">
          <span
            className="px-2.5 py-1 rounded-[5px]"
            style={{ fontSize: "11px", fontWeight: 500, color: "#16a34a", background: "#16a34a12" }}
          >
            {have.length} you have
          </span>
          <span
            className="px-2.5 py-1 rounded-[5px]"
            style={{ fontSize: "11px", fontWeight: 500, color: "#dc2626", background: "#dc262612" }}
          >
            {missing.length} missing
          </span>
        </div>
      </div>

      {/* Missing skills */}
      {missing.length > 0 && (
        <div className="mb-5">
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Add to your resume
          </p>
          <div className="flex flex-col gap-2">
            {visibleMissing.map(({ skill, count }) => (
              <div key={skill} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#dc2626] rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span
                    className="flex-shrink-0"
                    style={{ fontSize: "12px", fontWeight: 500, color: "#333333", minWidth: "120px" }}
                  >
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </span>
                </div>
                <span
                  style={{ fontSize: "10px", color: "#aaaaaa", flexShrink: 0, minWidth: "50px", textAlign: "right" }}
                >
                  {count} job{count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
          {missing.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-left hover:underline"
              style={{ fontSize: "12px", color: "#6366f1" }}
            >
              {showAll ? "Show less" : `Show ${missing.length - 8} more`}
            </button>
          )}
        </div>
      )}

      {/* Skills already on resume */}
      {have.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Already on your resume
          </p>
          <div className="flex flex-wrap gap-1.5">
            {have.map(({ skill }) => (
              <span
                key={skill}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[5px]"
                style={{ fontSize: "11px", color: "#16a34a", background: "#16a34a10" }}
              >
                <span className="w-1 h-1 rounded-full bg-[#16a34a]" />
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
