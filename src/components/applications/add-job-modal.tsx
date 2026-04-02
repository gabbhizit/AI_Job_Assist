"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { KANBAN_COLUMNS } from "./kanban-board";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const EMPTY = { company: "", title: "", url: "", status: "applied", notes: "" };

export function AddJobModal({ isOpen, onClose, onAdded }: AddJobModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY);
    setError(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      onAdded();
      onClose();
    } catch {
      setError("Failed to add job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#111111",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#888888",
    marginBottom: "5px",
    display: "block",
  };
  const fieldClass = "w-full border border-[#e8e8e8] rounded-[6px] px-3 py-2 outline-none focus:border-[#6366f1] transition-colors bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-[12px] border border-[#e8e8e8] shadow-2xl"
        style={{ width: "480px", maxWidth: "calc(100vw - 2rem)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111111" }}>Add job manually</h2>
          <button onClick={onClose} className="p-1.5 rounded-[5px] text-[#aaaaaa] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Company *</label>
              <input
                value={form.company}
                onChange={set("company")}
                placeholder="e.g. Google"
                className={fieldClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <input
                value={form.title}
                onChange={set("title")}
                placeholder="e.g. Software Engineer"
                className={fieldClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Job URL</label>
            <input
              type="url"
              value={form.url}
              onChange={set("url")}
              placeholder="https://..."
              className={fieldClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Stage</label>
            <select value={form.status} onChange={set("status")} className={fieldClass} style={inputStyle}>
              {KANBAN_COLUMNS.map(({ status, label }) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Recruiter name, referral, next steps…"
              className={fieldClass}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {error && (
            <p style={{ fontSize: "12px", color: "#dc2626" }}>{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#e8e8e8] rounded-[6px] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontSize: "13px", color: "#555555" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-[6px] text-white hover:opacity-90 transition-opacity"
              style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Adding…" : "Add job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
