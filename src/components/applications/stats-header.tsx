import type { ApplicationStats } from "@/app/api/applications/route";

interface StatsHeaderProps {
  stats: ApplicationStats;
  loading?: boolean;
}

const STAT_CARDS = [
  {
    key: "totalApplied" as const,
    label: "Applied",
    color: "#0ea5e9",
    bg: "#0ea5e910",
    format: (v: number) => String(v),
  },
  {
    key: "responseRate" as const,
    label: "Response rate",
    color: "#6366f1",
    bg: "#6366f110",
    format: (v: number) => `${v}%`,
  },
  {
    key: "interviewCount" as const,
    label: "Interviews",
    color: "#d97706",
    bg: "#d9770610",
    format: (v: number) => String(v),
  },
  {
    key: "offerCount" as const,
    label: "Offers",
    color: "#16a34a",
    bg: "#16a34a10",
    format: (v: number) => String(v),
  },
  {
    key: "avgMatchScore" as const,
    label: "Avg match",
    color: "#8b5cf6",
    bg: "#8b5cf610",
    format: (v: number) => `${v}%`,
  },
];

export function StatsHeader({ stats, loading }: StatsHeaderProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {STAT_CARDS.map(({ key, label, color, bg, format }) => (
        <div
          key={key}
          className="flex-1 min-w-[100px] rounded-[10px] px-4 py-3 border border-[#e8e8e8]"
          style={{ background: bg }}
        >
          <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            {label}
          </p>
          <p style={{ fontSize: "22px", fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {loading ? "—" : format(stats[key])}
          </p>
        </div>
      ))}
    </div>
  );
}
