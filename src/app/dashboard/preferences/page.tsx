"use client";

import { useEffect, useState, useCallback } from "react";
import { Briefcase, MapPin, SlidersHorizontal, CalendarClock } from "lucide-react";

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 rounded-full transition-all"
      style={{ width: "36px", height: "20px", background: value ? "#6366f1" : "#e8e8e8" }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? "translateX(16px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
    </div>
  );
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function Tag({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[5px]"
      style={{
        fontSize: "12px",
        color,
        background: `${color}12`,
        border: `1px solid ${color}25`,
        padding: "3px 8px",
        lineHeight: "18px",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-60 transition-opacity"
        style={{ fontSize: "14px", lineHeight: 1, marginTop: "-1px" }}
      >
        ×
      </button>
    </span>
  );
}

// ── Button group ──────────────────────────────────────────────────────────────
function ButtonGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-[5px] border transition-all"
            style={{
              fontSize: "12px",
              background: active ? "#6366f1" : "white",
              color: active ? "white" : "#555555",
              borderColor: active ? "#6366f1" : "#e8e8e8",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    target_roles: [] as string[],
    target_locations: [] as string[],
    min_salary: null as number | null,
    experience_level: "entry" as string,
    remote_preference: "any" as string,
    notify_email: true,
  });
  const [optEndDate, setOptEndDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const fetchPrefs = useCallback(async () => {
    try {
      const [prefsRes, profileRes] = await Promise.all([
        fetch("/api/preferences"),
        fetch("/api/profile"),
      ]);
      const [prefsData, profileData] = await Promise.all([
        prefsRes.json(),
        profileRes.json(),
      ]);
      if (prefsData.preferences) {
        setPrefs({
          target_roles: prefsData.preferences.target_roles || [],
          target_locations: prefsData.preferences.target_locations || [],
          min_salary: prefsData.preferences.min_salary,
          experience_level: prefsData.preferences.experience_level || "entry",
          remote_preference: prefsData.preferences.remote_preference || "any",
          notify_email: prefsData.preferences.notify_email ?? true,
        });
      }
      if (profileData.profile?.opt_end_date) {
        setOptEndDate(profileData.profile.opt_end_date.slice(0, 10));
      }
    } catch {
      setError("Failed to load preferences. Please refresh.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const [prefsRes, profileRes] = await Promise.all([
        fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        }),
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opt_end_date: optEndDate || null }),
        }),
      ]);
      if (!prefsRes.ok || !profileRes.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save preferences. Please try again.");
    }
    setSaving(false);
  };

  const addItem = (field: "target_roles" | "target_locations", value: string) => {
    if (value.trim() && !prefs[field].includes(value.trim())) {
      setPrefs({ ...prefs, [field]: [...prefs[field], value.trim()] });
    }
  };

  const removeItem = (field: "target_roles" | "target_locations", value: string) => {
    setPrefs({ ...prefs, [field]: prefs[field].filter((v) => v !== value) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white";
  const inputStyle = { fontSize: "13px", color: "#111111" };

  return (
    <div className="px-8 py-7" style={{ maxWidth: "720px" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 style={{ color: "#111111", letterSpacing: "-0.03em", fontSize: "24px", fontWeight: 700 }}>
            Job Preferences
          </h1>
          <p style={{ fontSize: "13px", color: "#aaaaaa", marginTop: "3px" }}>
            Controls what jobs are matched and shown to you each day
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-[7px] text-white transition-all hover:opacity-90"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            background: saved
              ? "#16a34a"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            opacity: saving ? 0.7 : 1,
            minWidth: "120px",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save preferences"}
        </button>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-[7px] border" style={{ background: "#dc262608", borderColor: "rgba(220,38,38,0.2)", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">

        {/* ── Target Roles ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 shadow-sm">
          <SectionHeader
            icon={<Briefcase size={13} color="#6366f1" />}
            label="Target Roles"
            color="#6366f1"
          />
          {prefs.target_roles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {prefs.target_roles.map((role) => (
                <Tag
                  key={role}
                  label={role}
                  color="#6366f1"
                  onRemove={() => removeItem("target_roles", role)}
                />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. Software Engineer, ML Engineer"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("target_roles", roleInput);
                  setRoleInput("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => { addItem("target_roles", roleInput); setRoleInput(""); }}
              className="px-4 rounded-[6px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors flex-shrink-0"
              style={{ fontSize: "13px", color: "#555555" }}
            >
              Add
            </button>
          </div>
          {prefs.target_roles.length === 0 && (
            <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "8px" }}>
              No roles added yet — we&apos;ll use your resume skills to generate searches automatically
            </p>
          )}
        </div>

        {/* ── Locations ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 shadow-sm">
          <SectionHeader
            icon={<MapPin size={13} color="#0ea5e9" />}
            label="Locations"
            color="#0ea5e9"
          />
          {prefs.target_locations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {prefs.target_locations.map((loc) => (
                <Tag
                  key={loc}
                  label={loc}
                  color="#0ea5e9"
                  onRemove={() => removeItem("target_locations", loc)}
                />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. New York, NY · San Francisco, CA"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("target_locations", locationInput);
                  setLocationInput("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => { addItem("target_locations", locationInput); setLocationInput(""); }}
              className="px-4 rounded-[6px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors flex-shrink-0"
              style={{ fontSize: "13px", color: "#555555" }}
            >
              Add
            </button>
          </div>
          {prefs.target_locations.length === 0 && (
            <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "8px" }}>
              No locations added — all US locations will be searched
            </p>
          )}
        </div>

        {/* ── Job Criteria ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 shadow-sm">
          <SectionHeader
            icon={<SlidersHorizontal size={13} color="#8b5cf6" />}
            label="Job Criteria"
            color="#8b5cf6"
          />
          <div className="flex flex-col gap-5">

            {/* Min salary */}
            <div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "6px" }}>
                Minimum salary (annual, USD)
              </p>
              <input
                type="number"
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. 80000"
                value={prefs.min_salary ?? ""}
                onChange={(e) =>
                  setPrefs({ ...prefs, min_salary: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>

            {/* Experience level */}
            <div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "8px" }}>
                Experience level
              </p>
              <ButtonGroup
                value={prefs.experience_level as "entry" | "mid" | "senior"}
                options={[
                  { value: "entry", label: "Entry (0–3 yrs)" },
                  { value: "mid", label: "Mid (3–7 yrs)" },
                  { value: "senior", label: "Senior (7+ yrs)" },
                ]}
                onChange={(v) => setPrefs({ ...prefs, experience_level: v })}
              />
            </div>

            {/* Remote preference */}
            <div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "8px" }}>
                Work arrangement
              </p>
              <ButtonGroup
                value={prefs.remote_preference as "any" | "remote" | "hybrid" | "onsite"}
                options={[
                  { value: "any", label: "Any" },
                  { value: "remote", label: "Remote only" },
                  { value: "hybrid", label: "Hybrid" },
                  { value: "onsite", label: "On-site" },
                ]}
                onChange={(v) => setPrefs({ ...prefs, remote_preference: v })}
              />
            </div>
          </div>
        </div>

        {/* ── Visa & Notifications ──────────────────────────────────────────── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 shadow-sm">
          <SectionHeader
            icon={<CalendarClock size={13} color="#d97706" />}
            label="Visa & Notifications"
            color="#d97706"
          />
          <div className="flex flex-col gap-5">

            {/* OPT end date */}
            <div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "6px" }}>
                OPT end date
              </p>
              <input
                type="date"
                className={inputClass}
                style={inputStyle}
                value={optEndDate}
                onChange={(e) => setOptEndDate(e.target.value)}
              />
              <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "5px" }}>
                Powers the OPT Countdown widget on your dashboard
              </p>
            </div>

            {/* Email notifications toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "13px", color: "#333333" }}>Email notifications</p>
                <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "2px" }}>
                  Daily digest of your top job matches
                </p>
              </div>
              <Toggle
                value={prefs.notify_email}
                onChange={(v) => setPrefs({ ...prefs, notify_email: v })}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
