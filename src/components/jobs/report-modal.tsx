"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";

interface ReportModalProps {
  jobTitle: string;
  company: string;
  onClose: () => void;
}

const REASONS = [
  "Job is no longer active",
  "Inaccurate visa/sponsorship info",
  "Misleading job description",
  "Duplicate listing",
  "Discriminatory language",
  "Other",
];

export function ReportModal({ jobTitle, company, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
        <div className="relative bg-white rounded-[12px] border border-[#e8e8e8] w-[400px] p-8 shadow-2xl flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: "44px", height: "44px", background: "#16a34a15" }}
          >
            <Check size={20} color="#16a34a" />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#111111" }}>Report submitted</p>
          <p style={{ fontSize: "12px", color: "#888888" }}>Thanks for helping us improve OfferPath.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] border border-[#e8e8e8] w-[400px] p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 style={{ color: "#111111", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Report job
            </h3>
            <p style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
              {jobTitle} at {company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-[#aaaaaa] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`flex items-center gap-3 px-3 py-2.5 border rounded-[7px] text-left transition-colors ${
                selected === r
                  ? "border-[#dc2626]/30 bg-[#dc2626]/5 text-[#dc2626]"
                  : "border-[#e8e8e8] text-[#555555] hover:border-[#d0d0d0] hover:bg-[#fafafa]"
              }`}
              style={{ fontSize: "13px" }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  selected === r ? "border-[#dc2626] bg-[#dc2626]" : "border-[#d0d0d0]"
                }`}
              >
                {selected === r && <Check size={8} color="white" />}
              </div>
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full border border-[#e8e8e8] rounded-[7px] px-3 py-2 outline-none focus:border-[#aaaaaa] transition-colors resize-none mb-4"
          style={{ fontSize: "12px", color: "#333333" }}
          placeholder="Additional context (optional)..."
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="flex-1 py-2.5 bg-[#dc2626] text-white rounded-[7px] hover:bg-[#b91c1c] transition-colors disabled:opacity-40"
            style={{ fontSize: "13px" }}
          >
            Submit report
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-[#e8e8e8] text-[#555555] rounded-[7px] hover:bg-[#f5f5f5] transition-colors"
            style={{ fontSize: "13px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
