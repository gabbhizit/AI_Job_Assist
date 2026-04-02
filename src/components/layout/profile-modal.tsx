"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "./sheet";

interface Profile {
  full_name: string;
  email: string;
  visa_status: string;
  opt_end_date: string | null;
}

interface Preferences {
  target_roles: string[];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [visaStatus, setVisaStatus] = useState("");
  const [optEndDate, setOptEndDate] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setEditing(false);

    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/preferences").then((r) => r.json()),
      fetch("/api/resume").then((r) => r.json()),
    ]).then(([profileRes, prefsRes, resumeRes]) => {
      const p = profileRes.profile;
      if (p) {
        setProfile(p);
        setName(p.full_name || "");
        setVisaStatus(p.visa_status || "");
        setOptEndDate(p.opt_end_date || "");
      }
      setPrefs(prefsRes.preferences);
      setHasResume(!!(resumeRes.resume?.parsing_status === "completed"));
    });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, visa_status: visaStatus, opt_end_date: optEndDate || null }),
    });
    setSaving(false);
    setEditing(false);
    setProfile((prev) => prev ? { ...prev, full_name: name, visa_status: visaStatus, opt_end_date: optEndDate || null } : prev);
  };

  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const completeness = [
    { label: "Basic info", done: !!name },
    { label: "Email verified", done: !!profile?.email },
    { label: "Visa status set", done: !!visaStatus },
    { label: "OPT end date", done: !!optEndDate },
    { label: "Job preferences", done: !!(prefs?.target_roles?.length) },
    { label: "Resume uploaded", done: hasResume },
  ];
  const pct = Math.round((completeness.filter((c) => c.done).length / completeness.length) * 100);

  const visaLabels: Record<string, string> = {
    f1_opt: "F-1 OPT",
    h1b: "H-1B",
    citizen: "US Citizen",
    green_card: "Green Card",
    other: "Other",
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Profile" width="460px">
      <div className="px-6 py-5">
        {/* Avatar + meta */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="flex items-center justify-center rounded-full shadow-md flex-shrink-0"
            style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <span style={{ fontSize: "20px", color: "white", fontWeight: 600 }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: "16px", color: "#111111", fontWeight: 500 }}>{name || "—"}</p>
            <p style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>{profile?.email || ""}</p>
            {visaStatus && (
              <span style={{ fontSize: "10px", color: "#6366f1", background: "#6366f110", padding: "1px 6px", borderRadius: "3px", marginTop: "4px", display: "inline-block" }}>
                {visaLabels[visaStatus] ?? visaStatus}
              </span>
            )}
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className="px-3 py-1.5 border border-[#e8e8e8] rounded-[5px] hover:bg-[#f5f5f5] transition-colors flex-shrink-0"
            style={{ fontSize: "12px", color: "#555555" }}
          >
            {saving ? "Saving…" : editing ? "Save" : "Edit"}
          </button>
        </div>

        {/* Completeness */}
        <div className="border border-[#e8e8e8] rounded-[8px] p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Profile completeness
            </p>
            <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-[#f0f0f0] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #16a34a, #4ade80)" }}
            />
          </div>
          <div className="flex flex-col gap-2">
            {completeness.map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: "16px", height: "16px", background: c.done ? "#16a34a1a" : "#f0f0f0" }}
                >
                  {c.done && <Check size={10} color="#16a34a" />}
                </div>
                <span style={{ fontSize: "12px", color: c.done ? "#555555" : "#aaaaaa" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {/* Full name */}
          <div>
            <p style={{ fontSize: "11px", color: "#888888", marginBottom: "5px" }}>Full name</p>
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white"
                style={{ fontSize: "13px", color: "#111111" }}
              />
            ) : (
              <p style={{ fontSize: "13px", color: "#333333" }}>{name || "—"}</p>
            )}
          </div>

          {/* Email (read-only always) */}
          <div>
            <p style={{ fontSize: "11px", color: "#888888", marginBottom: "5px" }}>Email</p>
            <p style={{ fontSize: "13px", color: "#333333" }}>{profile?.email || "—"}</p>
          </div>

          {/* Visa status */}
          <div>
            <p style={{ fontSize: "11px", color: "#888888", marginBottom: "5px" }}>Visa status</p>
            {editing ? (
              <select
                value={visaStatus}
                onChange={(e) => setVisaStatus(e.target.value)}
                className="w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white"
                style={{ fontSize: "13px", color: "#111111" }}
              >
                <option value="">Select…</option>
                <option value="f1_opt">F-1 OPT</option>
                <option value="h1b">H-1B</option>
                <option value="green_card">Green Card</option>
                <option value="citizen">US Citizen</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <p style={{ fontSize: "13px", color: "#333333" }}>{(visaLabels[visaStatus] ?? visaStatus) || "—"}</p>
            )}
          </div>

          {/* OPT end date */}
          <div>
            <p style={{ fontSize: "11px", color: "#888888", marginBottom: "5px" }}>OPT end date</p>
            {editing ? (
              <input
                type="date"
                value={optEndDate}
                onChange={(e) => setOptEndDate(e.target.value)}
                className="w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white"
                style={{ fontSize: "13px", color: "#111111" }}
              />
            ) : (
              <p style={{ fontSize: "13px", color: "#333333" }}>
                {optEndDate ? new Date(optEndDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
              </p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
