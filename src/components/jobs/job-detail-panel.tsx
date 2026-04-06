"use client";

import { Building2, Share2, X, SendHorizonal, Flag, Check } from "lucide-react";
import type { MatchedJob } from "./job-list-item";

interface JobDetailPanelProps {
  job: MatchedJob;
  userSkills: string[];
  isApplied: boolean;
  isLoading?: boolean;
  onApply: () => void;
  onSkip: () => void;
  onShare: () => void;
  onReport: () => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff}h ago`;
  const days = Math.floor(diff / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function inferAts(url: string | null): string {
  if (!url) return "Unknown";
  if (url.includes("greenhouse")) return "Greenhouse";
  if (url.includes("lever")) return "Lever";
  if (url.includes("workday")) return "Workday";
  if (url.includes("ashbyhq")) return "Ashby";
  if (url.includes("smartrecruiters")) return "SmartRecruiters";
  if (url.includes("icims")) return "iCIMS";
  if (url.includes("linkedin")) return "LinkedIn";
  if (url.includes("indeed")) return "Indeed";
  return "Company site";
}

export function JobDetailPanel({
  job,
  userSkills,
  isApplied,
  isLoading = false,
  onApply,
  onSkip,
  onShare,
  onReport,
}: JobDetailPanelProps) {
  const scoreColor =
    job.score >= 80 ? "#16a34a" : job.score >= 65 ? "#d97706" : "#dc2626";

  // Skills matching
  const userSkillsLower = userSkills.map((s) => s.toLowerCase());
  const matchedSkills = job.skillsExtracted.filter((s) =>
    userSkillsLower.includes(s.toLowerCase())
  );
  const missingSkills = job.skillsExtracted.filter(
    (s) => !userSkillsLower.includes(s.toLowerCase())
  );

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const ats = inferAts(job.applicationUrl);

  // Experience fit label from score_breakdown.experience (0–25 points)
  const expScore = job.scoreBreakdown.experience ?? 0;
  const expLabel =
    expScore >= 18 ? "Strong match ✓" : expScore >= 10 ? "Good match ✓" : "Possible gap";
  const expOk = expScore >= 10;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f7f8fc" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-[680px]">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: "white", border: "1px solid #e8e8e8" }}
              >
                <Building2 size={20} color="#aaaaaa" />
              </div>
              <div>
                <h2
                  style={{
                    color: "#111111",
                    fontSize: "18px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {job.title}
                </h2>
                <p style={{ fontSize: "14px", color: "#888888", marginTop: "3px" }}>
                  {job.company}
                  {(job.location || job.isRemote) && (
                    <> · {job.isRemote ? "Remote" : job.location}</>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {job.isH1bSponsor && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#16a34a",
                        background: "#16a34a10",
                        padding: "1px 7px",
                        borderRadius: "4px",
                        border: "1px solid #16a34a20",
                      }}
                    >
                      H1B ✓
                    </span>
                  )}
                  {job.isEverified && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#0ea5e9",
                        background: "#0ea5e910",
                        padding: "1px 7px",
                        borderRadius: "4px",
                        border: "1px solid #0ea5e920",
                      }}
                    >
                      E-Verified
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "#cccccc" }}>{ats}</span>
                  {job.postedAt && (
                    <span style={{ fontSize: "11px", color: "#cccccc" }}>
                      {timeAgo(job.postedAt)}
                    </span>
                  )}
                  {salary && (
                    <span style={{ fontSize: "11px", color: "#888888", fontWeight: 500 }}>
                      {salary}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onShare}
                className="p-2 border border-[#e8e8e8] rounded-[7px] bg-white text-[#aaaaaa] hover:text-[#6366f1] hover:border-[#6366f1]/30 transition-all shadow-sm"
                title="Share"
              >
                <Share2 size={13} />
              </button>
              <button
                onClick={onSkip}
                className="p-2 border border-[#e8e8e8] rounded-[7px] bg-white text-[#aaaaaa] hover:text-[#dc2626] hover:border-[#dc2626]/25 transition-all shadow-sm"
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Fit Score card ──────────────────────────────────── */}
          <div
            className="rounded-[10px] p-5 mb-4 shadow-sm"
            style={{ background: "white", border: "1px solid #e8e8e8" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaaaaa",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Fit Score
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-36 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${job.score}%`,
                      background: scoreColor,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "20px",
                    color: scoreColor,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {job.score}%
                </span>
              </div>
            </div>

            {[
              {
                label: "Skills",
                value:
                  job.skillsExtracted.length > 0
                    ? `${matchedSkills.length} / ${job.skillsExtracted.length} matched`
                    : "Skills not listed",
                ok: matchedSkills.length >= job.skillsExtracted.length / 2,
              },
              {
                label: "Experience",
                value: expLabel,
                ok: expOk,
              },
              {
                label: "Visa",
                value: job.isH1bSponsor
                  ? `${job.company} sponsors H1B visas ✓`
                  : "No sponsorship history on record",
                ok: job.isH1bSponsor,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-3 py-2.5 border-t border-[#f5f5f5]"
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#aaaaaa",
                    width: "80px",
                    flexShrink: 0,
                    paddingTop: "1px",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: row.ok ? "#555555" : "#dc2626",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── AI Analysis card ────────────────────────────────── */}
          <div
            className="rounded-[10px] p-5 mb-4 shadow-sm"
            style={{ background: "white", border: "1px solid #e8e8e8" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-5 h-5 rounded-[4px] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <span style={{ fontSize: "9px", color: "white", fontWeight: 700 }}>AI</span>
              </div>
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaaaaa",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                AI Analysis
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.7 }}>
              This role is a{" "}
              <span style={{ color: scoreColor, fontWeight: 500 }}>
                {job.score >= 80 ? "strong" : job.score >= 65 ? "good" : "potential"} match
              </span>
              .{" "}
              {job.scoreBreakdown.explanation ||
                `${job.company} is hiring for ${job.title} and your background aligns with their requirements.`}
              {missingSkills.length > 0 &&
                ` Gap: ${missingSkills.slice(0, 3).join(", ")} — consider mentioning related work in your application.`}
            </p>
          </div>

          {/* ── Skills card ─────────────────────────────────────── */}
          {job.skillsExtracted.length > 0 && (
            <div
              className="rounded-[10px] p-5 mb-4 shadow-sm"
              style={{ background: "white", border: "1px solid #e8e8e8" }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaaaaa",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "12px",
                }}
              >
                Skills
              </p>
              {matchedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {matchedSkills.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: "12px",
                        color: "#16a34a",
                        background: "#16a34a10",
                        padding: "3px 9px",
                        borderRadius: "5px",
                        border: "1px solid #16a34a20",
                      }}
                    >
                      {s} ✓
                    </span>
                  ))}
                </div>
              )}
              {missingSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: "12px",
                        color: "#dc2626",
                        background: "#dc262610",
                        padding: "3px 9px",
                        borderRadius: "5px",
                        border: "1px solid #dc262620",
                      }}
                    >
                      {s} missing
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Company Intelligence card ────────────────────────── */}
          <div
            className="rounded-[10px] p-5 mb-4 shadow-sm"
            style={{ background: "white", border: "1px solid #e8e8e8" }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "#aaaaaa",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              Company Intelligence
            </p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {[
                { label: "Work type", value: job.isRemote ? "Remote" : job.location ? "On-site" : "—" },
                { label: "Job type", value: job.jobType ?? "Full-time" },
                { label: "H1B sponsorship", value: job.isH1bSponsor ? "Known sponsor" : "Not confirmed" },
                { label: "E-Verified", value: job.isEverified ? "Yes ✓" : "Not confirmed" },
                { label: "ATS platform", value: ats },
                { label: "Seniority", value: job.experienceLevel ? capitalize(job.experienceLevel) : "—" },
              ].map((item) => (
                <div key={item.label}>
                  <span
                    style={{ fontSize: "11px", color: "#cccccc", display: "block", marginBottom: "2px" }}
                  >
                    {item.label}
                  </span>
                  <span style={{ fontSize: "13px", color: "#555555" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description (if available) */}
          {job.description && (
            <div
              className="rounded-[10px] p-5 mb-4 shadow-sm"
              style={{ background: "white", border: "1px solid #e8e8e8" }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaaaaa",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}
              >
                Job Description
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#555555",
                  lineHeight: 1.7,
                  whiteSpace: "pre-line",
                }}
                className="line-clamp-[12]"
              >
                {job.description.slice(0, 800)}
                {job.description.length > 800 && "…"}
              </p>
            </div>
          )}

          {/* Report link */}
          <button
            onClick={onReport}
            className="flex items-center gap-1.5 text-[#cccccc] hover:text-[#dc2626] transition-colors mb-4"
            style={{ fontSize: "12px" }}
          >
            <Flag size={12} /> Report this job
          </button>
        </div>
      </div>

      {/* ── Fixed action bar ────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t border-[#e8e8e8] bg-white px-7 py-4"
      >
        <div className="max-w-[680px] flex items-center gap-3">
          {isApplied ? (
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] border cursor-default"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#16a34a",
                background: "#16a34a10",
                borderColor: "#16a34a20",
              }}
            >
              <Check size={14} /> Applied ✓
            </button>
          ) : (
            <button
              onClick={onApply}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-[8px] text-white hover:opacity-90 transition-opacity shadow-md disabled:opacity-60"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                background: "linear-gradient(135deg, #111111, #333333)",
              }}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SendHorizonal size={14} />
              )}
              {isLoading ? "Saving…" : "Apply now"}
            </button>
          )}

          <button
            onClick={onShare}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#e8e8e8] text-[#555555] rounded-[8px] hover:border-[#6366f1]/25 hover:text-[#6366f1] transition-all"
            style={{ fontSize: "13px" }}
          >
            <Share2 size={13} /> Share
          </button>

          <button
            onClick={onSkip}
            disabled={isLoading}
            className="ml-auto px-4 py-2.5 text-[#cccccc] hover:text-[#888888] transition-colors disabled:opacity-50"
            style={{ fontSize: "13px" }}
          >
            Skip →
          </button>
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
