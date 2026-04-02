"use client";

import { Sparkles } from "lucide-react";
import type { ParsedResume } from "@/lib/supabase/types";
import { computeAts } from "./ats-score";

interface ScoreBarProps {
  label: string;
  value: number; // 0–100
  color?: string;
}

function ScoreBar({ label, value, color }: ScoreBarProps) {
  const c = color ?? (value >= 70 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626");
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: "11px", color: "#666666" }}>{label}</span>
        <span style={{ fontSize: "11px", fontWeight: 600, color: c }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: c }}
        />
      </div>
    </div>
  );
}

function computeStrengthBars(resume: ParsedResume) {
  // Collect all bullet lines from experience
  const allBullets: string[] = [];
  for (const exp of resume.experience ?? []) {
    const lines = exp.description
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    allBullets.push(...lines);
  }

  // Impact language: bullets that mention numbers or %
  const impactCount = allBullets.filter((b) => /\d/.test(b)).length;
  const impactLanguage = allBullets.length > 0
    ? Math.min(100, Math.round((impactCount / allBullets.length) * 100))
    : 0;

  // Specificity: avg word count of bullets, scale 8+ words → 100
  const avgWords = allBullets.length > 0
    ? allBullets.reduce((s, b) => s + b.split(/\s+/).length, 0) / allBullets.length
    : 0;
  const specificity = Math.min(100, Math.round((avgWords / 10) * 100));

  // Keywords density: skills count
  const skillsCount = resume.skills_flat?.length ?? 0;
  const keywords = Math.min(100, skillsCount >= 15 ? 90 : skillsCount * 6);

  // Relevance: target roles derived → proxy via experience count * 20 capped 100
  const relevance = Math.min(100, (resume.experience?.length ?? 0) * 22 + (resume.target_roles_inferred?.length ?? 0) * 8);

  return { impactLanguage, specificity, keywords, relevance };
}

interface ResumeAtsPanelProps {
  resume: ParsedResume;
  onUpgradeClick?: () => void;
}

export function ResumeAtsPanel({ resume, onUpgradeClick }: ResumeAtsPanelProps) {
  const { score, criteria } = computeAts(resume);
  const strength = computeStrengthBars(resume);

  // Map criteria to panel bars (Formatting, Keywords, Sections, Experience, Length)
  const contactCriteria = criteria.find((c) => c.label === "Contact info");
  const skillsCriteria = criteria.find((c) => c.label === "Skills section");
  const expCriteria = criteria.find((c) => c.label === "Work experience");
  const projCriteria = criteria.find((c) => c.label === "Projects");

  const formatPct = contactCriteria
    ? Math.round((contactCriteria.earned / contactCriteria.points) * 100)
    : 0;
  const keywordsPct = skillsCriteria
    ? Math.round((skillsCriteria.earned / skillsCriteria.points) * 100)
    : 0;

  const hasSummary = !!resume.summary;
  const hasExp = (resume.experience?.length ?? 0) > 0;
  const hasEdu = (resume.education?.length ?? 0) > 0;
  const sectionsPct = Math.round(([hasSummary, hasExp, hasEdu].filter(Boolean).length / 3) * 100);

  const expPct = expCriteria
    ? Math.round((expCriteria.earned / expCriteria.points) * 100)
    : 0;
  const lengthPct = (projCriteria?.earned ?? 0) > 0 ? 80 : 60;

  const scoreColor = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const scoreLabel = score >= 75 ? "Strong" : score >= 50 ? "Fair" : "Weak";

  return (
    <div className="flex flex-col gap-4">
      {/* ATS Score card */}
      <div className="border border-[#e8e8e8] rounded-[12px] p-4">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#111111" }}>ATS Score</p>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ color: scoreColor, background: `${scoreColor}15` }}
          >
            {scoreLabel}
          </span>
        </div>

        {/* Big score */}
        <div className="flex items-end gap-1 mb-3">
          <span style={{ fontSize: "36px", fontWeight: 700, color: "#111111", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {score}
          </span>
          <span style={{ fontSize: "14px", color: "#aaaaaa", marginBottom: "4px" }}>/100</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <ScoreBar label="Formatting" value={formatPct} />
          <ScoreBar label="Keywords" value={keywordsPct} />
          <ScoreBar label="Sections" value={sectionsPct} />
          <ScoreBar label="Experience depth" value={expPct} />
          <ScoreBar label="Length" value={lengthPct} color="#6366f1" />
        </div>
      </div>

      {/* Resume Strength card */}
      <div className="border border-[#e8e8e8] rounded-[12px] p-4">
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#111111", marginBottom: "12px" }}>
          Resume Strength
        </p>
        <div className="flex flex-col gap-2.5">
          <ScoreBar label="Impact language" value={strength.impactLanguage} />
          <ScoreBar label="Specificity" value={strength.specificity} />
          <ScoreBar label="Relevance" value={strength.relevance} />
          <ScoreBar label="Keywords density" value={strength.keywords} />
        </div>
      </div>

      {/* AI Suggestion card (Pro teaser) */}
      <div
        className="border border-dashed border-[#e0e0e0] rounded-[12px] p-4 flex flex-col items-center text-center gap-2"
        style={{ background: "#fafafa" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #8b5cf615, #6366f115)" }}
        >
          <Sparkles size={16} color="#8b5cf6" />
        </div>
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#333333" }}>
          AI bullet rewrites
        </p>
        <p style={{ fontSize: "11px", color: "#aaaaaa", maxWidth: "180px" }}>
          Upgrade to Pro to get Claude-powered bullet improvements tailored to each job.
        </p>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="mt-1 px-4 py-1.5 rounded-[6px] text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: "11px", fontWeight: 500, background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
          >
            Unlock Pro
          </button>
        )}
      </div>
    </div>
  );
}
