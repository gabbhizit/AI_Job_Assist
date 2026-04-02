"use client";

import { useEffect, useState } from "react";
import type { ParsedResume } from "@/lib/supabase/types";

interface SkillPlanProps {
  resume: ParsedResume | null;
}

interface SkillRow {
  skill: string;
  count: number; // how many matched jobs require it
  have: boolean;
  priority: "high" | "medium" | "low";
}

const LEARNING_LINKS: Record<string, string> = {
  python: "https://docs.python.org/3/tutorial/",
  javascript: "https://javascript.info",
  typescript: "https://www.typescriptlang.org/docs/",
  react: "https://react.dev",
  "next.js": "https://nextjs.org/learn",
  "node.js": "https://nodejs.org/en/learn",
  sql: "https://mode.com/sql-tutorial/",
  postgresql: "https://www.postgresql.org/docs/",
  aws: "https://aws.amazon.com/training/",
  docker: "https://docs.docker.com/get-started/",
  kubernetes: "https://kubernetes.io/docs/tutorials/",
  git: "https://git-scm.com/book/en/v2",
  "system design": "https://github.com/donnemartin/system-design-primer",
};

function getPriorityColor(p: "high" | "medium" | "low"): string {
  return p === "high" ? "#dc2626" : p === "medium" ? "#d97706" : "#16a34a";
}

function getPriorityBg(p: "high" | "medium" | "low"): string {
  return p === "high" ? "#dc262615" : p === "medium" ? "#d9770615" : "#16a34a15";
}

export function SkillPlan({ resume }: SkillPlanProps) {
  const [rows, setRows] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const matches = data.matches || [];
        const userSkills = new Set(
          (resume?.skills_flat ?? []).map((s: string) => s.toLowerCase())
        );

        // Count skill frequency across all matches
        const freq: Record<string, number> = {};
        for (const match of matches) {
          for (const skill of match.jobs?.skills_extracted ?? []) {
            const key = skill.toLowerCase();
            freq[key] = (freq[key] ?? 0) + 1;
          }
        }

        const total = matches.length || 1;
        const result: SkillRow[] = Object.entries(freq)
          .filter(([, count]) => count >= 2) // show skills mentioned in ≥2 jobs
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([skill, count]) => {
            const have = userSkills.has(skill);
            const pct = count / total;
            const priority: "high" | "medium" | "low" =
              pct >= 0.5 ? "high" : pct >= 0.25 ? "medium" : "low";
            return { skill, count, have, priority };
          });

        setRows(result);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [resume]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: "13px", color: "#aaaaaa", textAlign: "center", padding: "48px 0" }}>
        No match data yet. Jobs need to be fetched and matched first.
      </p>
    );
  }

  const missing = rows.filter((r) => !r.have);
  const have = rows.filter((r) => r.have);

  return (
    <div className="flex flex-col gap-5">
      <p style={{ fontSize: "12px", color: "#888888" }}>
        Based on skills required across your {rows.length} most frequent job matches.
        Missing skills ranked by how often they appear.
      </p>

      {/* Missing skills — action items */}
      {missing.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            Skills to learn ({missing.length})
          </p>
          <div className="flex flex-col gap-2">
            {missing.map(({ skill, count, priority }) => {
              const link = LEARNING_LINKS[skill.toLowerCase()];
              return (
                <div
                  key={skill}
                  className="flex items-center gap-3 border border-[#e8e8e8] rounded-[8px] px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#111111" }}>
                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                      </span>
                      <span
                        className="rounded-[3px] px-1.5 py-0.5"
                        style={{ fontSize: "10px", fontWeight: 500, color: getPriorityColor(priority), background: getPriorityBg(priority) }}
                      >
                        {priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, (count / (rows[0]?.count || 1)) * 100)}%`, background: getPriorityColor(priority) }}
                        />
                      </div>
                      <span style={{ fontSize: "10px", color: "#aaaaaa", flexShrink: 0 }}>
                        {count} job{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-2.5 py-1 border border-[#e8e8e8] rounded-[5px] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
                      style={{ fontSize: "11px", color: "#888888" }}
                    >
                      Learn →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills you already have */}
      {have.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            Skills you already have ({have.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {have.map(({ skill, count }) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border"
                style={{ fontSize: "12px", color: "#16a34a", background: "#16a34a10", borderColor: "#16a34a20" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
                <span style={{ fontSize: "10px", color: "#aaaaaa" }}>({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
