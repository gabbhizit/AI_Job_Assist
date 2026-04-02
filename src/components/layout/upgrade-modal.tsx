"use client";

import { useEffect } from "react";
import { X, Check } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREE_FEATURES = [
  "Profile & resume builder",
  "Unlimited job browsing",
  "Visa sponsor filter + H1B data",
  "Application tracker (up to 50)",
  "AI Coach (5 questions/week)",
  "3 tailored resumes/month",
];

const PRO_FEATURES = [
  "Unlimited tailored resumes & cover letters",
  "Full AI Coach (unlimited questions)",
  "Full application analytics",
  "Real-time job alerts",
  "Interview prep packs",
  "OPT timeline planning",
  "Salary negotiation assistant",
  "Priority match scoring",
];

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Modal card */}
      <div
        className="relative bg-white rounded-[14px] border border-[#e8e8e8] shadow-2xl overflow-y-auto"
        style={{ width: "600px", maxWidth: "calc(100vw - 2rem)", maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#f0f0f0]">
          <div>
            <h2 style={{ color: "#111111", fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Upgrade to Pro
            </h2>
            <p style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
              Unlock the full job search execution layer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-[#aaaaaa] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Plans grid */}
        <div className="px-7 py-6 grid grid-cols-2 gap-4">
          {/* Free */}
          <div className="border border-[#e8e8e8] rounded-[10px] p-5">
            <p style={{ fontSize: "11px", color: "#888888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Free
            </p>
            <p style={{ fontSize: "26px", color: "#111111", fontWeight: 600, letterSpacing: "-0.04em", marginBottom: "16px" }}>
              $0
            </p>
            <div className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex gap-2">
                  <Check size={13} color="#aaaaaa" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#888888" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div
            className="rounded-[10px] p-5"
            style={{ border: "2px solid #6366f1", background: "linear-gradient(160deg, rgba(99,102,241,0.05) 0%, transparent 60%)" }}
          >
            <p style={{ fontSize: "11px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Pro
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <p style={{ fontSize: "26px", color: "#111111", fontWeight: 600, letterSpacing: "-0.04em" }}>$19</p>
              <p style={{ fontSize: "12px", color: "#888888" }}>/month</p>
            </div>
            <p style={{ fontSize: "11px", color: "#16a34a", marginBottom: "16px" }}>
              30-day free trial — no credit card needed
            </p>
            <div className="flex flex-col gap-2.5">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex gap-2">
                  <Check size={13} color="#6366f1" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#333333" }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 text-white rounded-[7px] hover:opacity-90 transition-opacity"
              style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Start Pro free for 30 days
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
