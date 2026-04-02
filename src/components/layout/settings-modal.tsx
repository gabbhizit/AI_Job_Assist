"use client";

import { useEffect, useState } from "react";
import { Bell, Shield, Download, Zap } from "lucide-react";
import { Sheet } from "./sheet";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preferences {
  notify_email: boolean;
  notify_frequency: "daily" | "weekly";
  min_salary: number | null;
  excluded_companies: string[];
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyFrequency, setNotifyFrequency] = useState<"daily" | "weekly">("daily");
  const [minScore, setMinScore] = useState(65);
  const [excludedCompanies, setExcludedCompanies] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(({ preferences }) => {
        if (preferences) {
          setPrefs(preferences);
          setNotifyEmail(preferences.notify_email ?? true);
          setNotifyFrequency(preferences.notify_frequency ?? "daily");
          setExcludedCompanies((preferences.excluded_companies ?? []).join(", "));
        }
      });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    const excluded = excludedCompanies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(prefs ?? {}),
        notify_email: notifyEmail,
        notify_frequency: notifyFrequency,
        excluded_companies: excluded,
      }),
    });
    setSaving(false);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
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

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Settings" width="460px">
      <div className="px-6 py-5 flex flex-col gap-7">

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={13} color="#6366f1" />
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Notifications
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "13px", color: "#333333" }}>Email notifications</p>
                <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "2px" }}>Receive job matches by email</p>
              </div>
              <Toggle value={notifyEmail} onChange={setNotifyEmail} />
            </div>
            {notifyEmail && (
              <div className="flex items-center gap-3">
                <p style={{ fontSize: "12px", color: "#555555", flex: 1 }}>Frequency</p>
                <div className="flex gap-1">
                  {(["daily", "weekly"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNotifyFrequency(f)}
                      className="px-3 py-1.5 rounded-[5px] border transition-all"
                      style={{
                        fontSize: "12px",
                        background: notifyFrequency === f ? "#6366f1" : "white",
                        color: notifyFrequency === f ? "white" : "#555555",
                        borderColor: notifyFrequency === f ? "#6366f1" : "#e8e8e8",
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job filter prefs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={13} color="#d97706" />
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Job filters
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: "12px", color: "#555555" }}>Min match score to show</span>
                <span style={{ fontSize: "12px", color: "#111111", fontWeight: 500 }}>{minScore}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-[#6366f1]"
              />
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "6px" }}>Excluded companies</p>
              <input
                value={excludedCompanies}
                onChange={(e) => setExcludedCompanies(e.target.value)}
                placeholder="e.g. Amazon, Meta (comma-separated)"
                className="w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white"
                style={{ fontSize: "12px", color: "#111111" }}
              />
            </div>
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={13} color="#16a34a" />
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Account
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2.5 border border-[#e8e8e8] rounded-[6px] hover:bg-[#f5f5f5] transition-colors text-left"
              style={{ fontSize: "13px", color: "#555555" }}
            >
              <Download size={13} />
              Export all my data
            </button>
            <button
              className="px-3 py-2.5 border rounded-[6px] text-left hover:bg-[#dc2626]/5 transition-colors"
              style={{ fontSize: "13px", color: "#dc2626", borderColor: "rgba(220,38,38,0.2)" }}
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-[7px] text-white transition-opacity hover:opacity-90"
          style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </Sheet>
  );
}
