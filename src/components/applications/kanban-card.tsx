"use client";

import type { ApplicationItem } from "@/app/api/applications/route";

interface KanbanCardProps {
  item: ApplicationItem;
  onSelect: (matchId: string) => void;
  onDragStart: (matchId: string) => void;
}

export function KanbanCard({ item, onSelect, onDragStart }: KanbanCardProps) {
  const scoreColor =
    item.score >= 80 ? "#16a34a" : item.score >= 60 ? "#d97706" : "#888888";

  const formatSalary = () => {
    const { salaryMin: min, salaryMax: max } = item;
    if (!min && !max) return null;
    const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
    if (min && max) return `${fmt(min)}–${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary();

  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.matchId)}
      onClick={() => onSelect(item.matchId)}
      className="bg-white border border-[#e8e8e8] rounded-[8px] p-3 cursor-pointer hover:shadow-sm hover:border-[#d0d0d0] transition-all active:opacity-70"
      style={{ userSelect: "none" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p
          className="flex-1 leading-tight"
          style={{ fontSize: "12px", fontWeight: 500, color: "#111111" }}
        >
          {item.title}
        </p>
        <span
          className="flex-shrink-0 rounded-[4px] px-1.5 py-0.5"
          style={{ fontSize: "11px", fontWeight: 700, color: scoreColor, background: `${scoreColor}15`, lineHeight: 1.2 }}
        >
          {item.score}
        </span>
      </div>

      <p style={{ fontSize: "11px", color: "#888888" }}>{item.company}</p>

      {(item.location || item.isRemote) && (
        <p style={{ fontSize: "10px", color: "#aaaaaa", marginTop: "3px" }}>
          {item.isRemote ? "Remote" : item.location}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {item.isH1bSponsor && (
          <span style={{ fontSize: "9px", background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: "3px" }}>
            H1B
          </span>
        )}
        {item.isEverified && (
          <span style={{ fontSize: "9px", background: "#dcfce7", color: "#15803d", padding: "1px 5px", borderRadius: "3px" }}>
            E-Verified
          </span>
        )}
        {salary && (
          <span style={{ fontSize: "10px", color: "#888888" }}>{salary}</span>
        )}
      </div>
    </div>
  );
}
