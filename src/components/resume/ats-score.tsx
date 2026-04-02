"use client";

import type { ParsedResume } from "@/lib/supabase/types";

interface AtsCriteria {
  label: string;
  points: number;
  earned: number;
  tip: string;
}

function computeAts(resume: ParsedResume): { score: number; criteria: AtsCriteria[] } {
  const criteria: AtsCriteria[] = [
    {
      label: "Contact info",
      points: 20,
      earned: (resume.email ? 8 : 0) + (resume.phone ? 7 : 0) + (resume.linkedin ? 5 : 0),
      tip: "Include email, phone number, and LinkedIn URL.",
    },
    {
      label: "Professional summary",
      points: 15,
      earned: resume.summary ? 15 : 0,
      tip: "Add a 2–3 sentence summary at the top of your resume.",
    },
    {
      label: "Skills section",
      points: 25,
      earned:
        (resume.skills_flat?.length ?? 0) >= 15
          ? 25
          : (resume.skills_flat?.length ?? 0) >= 10
          ? 18
          : (resume.skills_flat?.length ?? 0) >= 5
          ? 10
          : 3,
      tip: "List at least 10–15 relevant technical skills. ATS scanners rely on keyword matching.",
    },
    {
      label: "Work experience",
      points: 25,
      earned:
        (resume.experience?.length ?? 0) >= 3
          ? 25
          : (resume.experience?.length ?? 0) >= 2
          ? 20
          : (resume.experience?.length ?? 0) >= 1
          ? 14
          : 0,
      tip: "Include all relevant roles with clear titles, company names, and date ranges.",
    },
    {
      label: "Education",
      points: 10,
      earned: (resume.education?.length ?? 0) >= 1 ? 10 : 0,
      tip: "Add your degree, institution, and graduation year.",
    },
    {
      label: "Projects",
      points: 5,
      earned: (resume.projects?.length ?? 0) >= 1 ? 5 : 0,
      tip: "Add 1–3 relevant projects with technologies used and impact.",
    },
  ];

  const score = Math.round(
    criteria.reduce((sum, c) => sum + c.earned, 0)
  );

  return { score, criteria };
}

// Semi-circular gauge (same visual language as HealthGauge in dashboard)
function AtsGauge({ score }: { score: number }) {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Fair" : "Weak";

  // Semi-circle arc
  const r = 54;
  const cx = 70;
  const cy = 70;
  const startAngle = -Math.PI; // left = 180°
  const sweep = Math.PI;       // half circle
  const pct = Math.min(score / 100, 1);

  const endAngle = startAngle + sweep * pct;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = pct > 0.5 ? 1 : 0;

  const trackX1 = cx + r * Math.cos(startAngle);
  const trackY1 = cy + r * Math.sin(startAngle);
  const trackX2 = cx + r * Math.cos(startAngle + sweep);
  const trackY2 = cy + r * Math.sin(startAngle + sweep);

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track */}
        <path
          d={`M ${trackX1} ${trackY1} A ${r} ${r} 0 1 1 ${trackX2} ${trackY2}`}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          style={{ fontSize: "22px", fontWeight: 700, fill: "#111111", letterSpacing: "-0.03em" }}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          style={{ fontSize: "9px", fill: "#aaaaaa", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          ATS Score
        </text>
      </svg>
      <span
        className="mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
        style={{ color, background: `${color}15` }}
      >
        {label}
      </span>
    </div>
  );
}

interface AtsScoreProps {
  resume: ParsedResume;
}

export function AtsScore({ resume }: AtsScoreProps) {
  const { score, criteria } = computeAts(resume);

  return (
    <div className="border border-[#e8e8e8] rounded-[12px] p-5">
      <div className="flex items-start justify-between gap-6">
        {/* Gauge */}
        <AtsGauge score={score} />

        {/* Criteria breakdown */}
        <div className="flex-1 flex flex-col gap-3">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>ATS Readiness</p>
          {criteria.map(({ label, points, earned, tip }) => {
            const pct = Math.round((earned / points) * 100);
            const color = pct >= 100 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: "12px", color: "#555555" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color }}>
                    {earned}/{points}
                  </span>
                </div>
                <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                {earned < points && (
                  <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "3px" }}>{tip}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
