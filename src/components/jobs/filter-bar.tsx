"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export interface JobFilters {
  role: string;
  h1b_sponsor: boolean;
  everified: boolean;
  date_posted: string; // "" | "1d" | "3d" | "7d"
  job_type: string;    // "" | "full-time" | "contract" | "internship"
  experience_level: string; // "" | "entry" | "mid" | "senior"
}

export const DEFAULT_FILTERS: JobFilters = {
  role: "",
  h1b_sponsor: false,
  everified: false,
  date_posted: "",
  job_type: "",
  experience_level: "",
};

function activeFilterCount(filters: JobFilters): number {
  return (
    (filters.role ? 1 : 0) +
    (filters.h1b_sponsor ? 1 : 0) +
    (filters.everified ? 1 : 0) +
    (filters.date_posted ? 1 : 0) +
    (filters.job_type ? 1 : 0) +
    (filters.experience_level ? 1 : 0)
  );
}

interface FilterBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const set = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const handleRoleChange = (value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      set("role", value);
    }, 300);
  };

  const count = activeFilterCount(filters);
  const hasFilters = count > 0;

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm " +
    "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  const toggleClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-colors ` +
    (active
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-background text-muted-foreground border-input hover:border-foreground/40");

  return (
    <div className="rounded-lg border bg-card p-4 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Filters
          {hasFilters && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {count}
            </span>
          )}
        </span>
        {hasFilters && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 1: Role search + selects */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search by role..."
          defaultValue={filters.role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-9 w-48 text-sm"
        />

        <select
          value={filters.date_posted}
          onChange={(e) => set("date_posted", e.target.value)}
          className={selectClass}
        >
          <option value="">Any date</option>
          <option value="1d">Last 24 hours</option>
          <option value="3d">Last 3 days</option>
          <option value="7d">Last 7 days</option>
        </select>

        <select
          value={filters.job_type}
          onChange={(e) => set("job_type", e.target.value)}
          className={selectClass}
        >
          <option value="">Any type</option>
          <option value="full-time">Full-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>

        <select
          value={filters.experience_level}
          onChange={(e) => set("experience_level", e.target.value)}
          className={selectClass}
        >
          <option value="">Any level</option>
          <option value="entry">Entry (0–3 yrs)</option>
          <option value="mid">Mid (3–7 yrs)</option>
          <option value="senior">Senior (7+ yrs)</option>
        </select>
      </div>

      {/* Row 2: Toggle pills */}
      <div className="flex flex-wrap gap-2">
        <button
          className={toggleClass(filters.h1b_sponsor)}
          onClick={() => set("h1b_sponsor", !filters.h1b_sponsor)}
        >
          <span>H1B Sponsor</span>
        </button>
        <button
          className={toggleClass(filters.everified)}
          onClick={() => set("everified", !filters.everified)}
        >
          <span>E-Verified</span>
        </button>
      </div>
    </div>
  );
}
