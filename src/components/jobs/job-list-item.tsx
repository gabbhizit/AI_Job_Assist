"use client";

import { Building2, MapPin, Clock, Bookmark, BookmarkCheck, SendHorizonal, Check } from "lucide-react";

export interface MatchedJob {
  matchId: string;
  jobId: string;
  score: number;
  scoreBreakdown: {
    title: number;
    skills: number;
    location: number;
    experience: number;
    recency: number;
    sponsor: number;
    total: number;
    explanation: string;
    is_h1b_sponsor?: boolean;
    is_everify?: boolean;
  };
  userStatus: string | null;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null;
  experienceLevel: string | null;
  skillsExtracted: string[];
  applicationUrl: string | null;
  postedAt: string | null;
  isH1bSponsor: boolean;
  isEverified: boolean;
  description: string | null;
}

interface JobListItemProps {
  job: MatchedJob;
  isActive: boolean;
  isSaved: boolean;
  isApplied: boolean;
  onSelect: () => void;
  onSave: (e: React.MouseEvent) => void;
  onQuickApply: (e: React.MouseEvent) => void;
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 65 ? "#d97706" : "#dc2626";
  return (
    <span
      style={{
        fontSize: "12px",
        color,
        background: `${color}12`,
        padding: "2px 7px",
        borderRadius: "5px",
        fontWeight: 600,
        border: `1px solid ${color}20`,
        flexShrink: 0,
      }}
    >
      {score}%
    </span>
  );
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

export function JobListItem({
  job,
  isActive,
  isSaved,
  isApplied,
  onSelect,
  onSave,
  onQuickApply,
}: JobListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`relative px-4 py-3.5 cursor-pointer border-b border-[#f5f5f5] transition-all group ${
        isActive
          ? "bg-[#6366f1]/5 border-l-2 border-l-[#6366f1]"
          : "hover:bg-[#fafafa] border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start gap-3 pr-10">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            isActive
              ? "bg-[#6366f1]/10 border border-[#6366f1]/20"
              : "bg-[#f5f5f5] border border-[#e8e8e8]"
          }`}
        >
          <Building2 size={15} color={isActive ? "#6366f1" : "#aaaaaa"} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              style={{ fontSize: "13px", color: "#111111", fontWeight: 500 }}
              className="truncate"
            >
              {job.title}
            </p>
            <ScoreChip score={job.score} />
          </div>
          <p style={{ fontSize: "12px", color: "#888888", marginTop: "1px" }}>{job.company}</p>

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {(job.location || job.isRemote) && (
              <span
                style={{ fontSize: "11px", color: "#cccccc", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <MapPin size={10} />
                {job.isRemote ? "Remote" : job.location}
              </span>
            )}
            {job.postedAt && (
              <span
                style={{ fontSize: "11px", color: "#cccccc", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <Clock size={10} />
                {timeAgo(job.postedAt)}
              </span>
            )}
            {job.isH1bSponsor && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#16a34a",
                  background: "#16a34a10",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid #16a34a20",
                }}
              >
                H1B ✓
              </span>
            )}
            {!job.isH1bSponsor && job.isH1bSponsor === false && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#dc2626",
                  background: "#dc262610",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid #dc262620",
                }}
              >
                No sponsorship
              </span>
            )}
          </div>

          {/* Status pills */}
          {(isSaved || isApplied) && (
            <div className="flex items-center gap-1.5 mt-2">
              {isApplied && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#16a34a",
                    background: "#16a34a10",
                    padding: "1px 5px",
                    borderRadius: "3px",
                  }}
                >
                  Applied ✓
                </span>
              )}
              {isSaved && !isApplied && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#888888",
                    background: "#f0f0f0",
                    padding: "1px 5px",
                    borderRadius: "3px",
                  }}
                >
                  Saved
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating hover actions */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5">
        {isApplied ? (
          <div
            className="w-8 h-8 rounded-[7px] flex items-center justify-center border"
            style={{ background: "#16a34a10", borderColor: "#16a34a20" }}
          >
            <Check size={13} color="#16a34a" />
          </div>
        ) : (
          <button
            onClick={onQuickApply}
            className="w-8 h-8 rounded-[7px] flex items-center justify-center hover:bg-black transition-colors shadow-md"
            style={{ background: "#111111" }}
            title="Apply now"
          >
            <SendHorizonal size={13} color="white" />
          </button>
        )}
        <button
          onClick={onSave}
          className={`w-8 h-8 rounded-[7px] flex items-center justify-center border transition-colors shadow-sm ${
            isSaved
              ? "bg-[#6366f1]/10 border-[#6366f1]/20"
              : "bg-white border-[#e8e8e8] hover:border-[#d0d0d0]"
          }`}
          title={isSaved ? "Unsave" : "Save"}
        >
          {isSaved ? (
            <BookmarkCheck size={12} color="#6366f1" />
          ) : (
            <Bookmark size={12} color="#aaaaaa" />
          )}
        </button>
      </div>
    </div>
  );
}
