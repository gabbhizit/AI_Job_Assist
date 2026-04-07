"use client";

import { useEffect, useState } from "react";
import { Bell, Shield, Download, Zap, Trash2 } from "lucide-react";
import { Sheet } from "./sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preferences {
  notify_email: boolean;
  notify_frequency: "daily" | "weekly";
  min_salary: number | null;
  excluded_companies: string[];
  min_match_score: number;
  target_roles?: string[];
  target_locations?: string[];
  experience_level?: string;
  remote_preference?: string;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local editable state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyFrequency, setNotifyFrequency] = useState<"daily" | "weekly">("daily");
  const [minScore, setMinScore] = useState(40);
  const [excludedCompanies, setExcludedCompanies] = useState("");

  // Account action states
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(({ preferences }) => {
        if (preferences) {
          setPrefs(preferences);
          setNotifyEmail(preferences.notify_email ?? true);
          setNotifyFrequency(preferences.notify_frequency ?? "daily");
          setMinScore(preferences.min_match_score ?? 40);
          setExcludedCompanies((preferences.excluded_companies ?? []).join(", "));
        }
      });
  }, [isOpen]);

  // Reset delete confirm state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirm(false);
      setDeleteInput("");
    }
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
        min_match_score: minScore,
      }),
    });
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "offerpath-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
      setDeleteInput("");
    }
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
              <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "4px" }}>
                Only jobs scoring at or above this threshold will appear
              </p>
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
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2.5 border border-[#e8e8e8] rounded-[6px] hover:bg-[#f5f5f5] transition-colors text-left disabled:opacity-60"
              style={{ fontSize: "13px", color: "#555555" }}
            >
              <Download size={13} />
              {exporting ? "Exporting…" : "Export all my data"}
            </button>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2.5 border rounded-[6px] text-left hover:bg-[#dc2626]/5 transition-colors"
                style={{ fontSize: "13px", color: "#dc2626", borderColor: "rgba(220,38,38,0.2)" }}
              >
                <Trash2 size={13} />
                Delete account
              </button>
            ) : (
              <div className="border rounded-[6px] p-3" style={{ borderColor: "rgba(220,38,38,0.3)", background: "#fff9f9" }}>
                <p style={{ fontSize: "12px", color: "#dc2626", marginBottom: "8px", fontWeight: 500 }}>
                  This will permanently delete your account and all data. Type DELETE to confirm.
                </p>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full border border-[#e8e8e8] rounded-[5px] px-3 py-1.5 outline-none mb-2"
                  style={{ fontSize: "12px" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                    className="flex-1 py-1.5 rounded-[5px] border border-[#e8e8e8] text-center"
                    style={{ fontSize: "12px", color: "#555555" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== "DELETE" || deleting}
                    className="flex-1 py-1.5 rounded-[5px] text-center disabled:opacity-40 transition-opacity"
                    style={{ fontSize: "12px", color: "white", background: "#dc2626" }}
                  >
                    {deleting ? "Deleting…" : "Delete forever"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-[7px] text-white transition-opacity hover:opacity-90"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            background: saveSuccess
              ? "#16a34a"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save settings"}
        </button>
      </div>
    </Sheet>
  );
}
