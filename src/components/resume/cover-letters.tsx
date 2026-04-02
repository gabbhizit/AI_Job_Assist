"use client";

import { useState } from "react";
import { Lock, Sparkles, FileText } from "lucide-react";
import { UpgradeModal } from "@/components/layout/upgrade-modal";

export function CoverLetters() {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <div className="border border-[#e8e8e8] rounded-[12px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>Cover Letters</p>
            <p style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
              AI-generated cover letters tailored to each job description
            </p>
          </div>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-[5px]"
            style={{ fontSize: "11px", fontWeight: 500, color: "#8b5cf6", background: "#8b5cf610" }}
          >
            <Lock size={10} />
            Pro
          </span>
        </div>

        {/* Feature preview */}
        <div
          className="rounded-[10px] border border-dashed border-[#e0e0e0] p-5 flex flex-col items-center text-center gap-3"
          style={{ background: "#fafafa" }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: "44px", height: "44px", background: "linear-gradient(135deg, #8b5cf615, #6366f115)" }}
          >
            <Sparkles size={20} color="#8b5cf6" />
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "#333333" }}>
              Smart cover letter generation
            </p>
            <p style={{ fontSize: "12px", color: "#aaaaaa", marginTop: "4px", maxWidth: "320px" }}>
              Paste a job description and Claude will write a personalised cover letter
              using your resume, highlighting your most relevant experience and skills.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-2 w-full max-w-xs text-left">
            {[
              "Personalised to each job description",
              "Highlights your most relevant experience",
              "Visa-friendly phrasing for OPT/H1B",
              "Multiple tone options (formal, concise, story-driven)",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <FileText size={11} color="#8b5cf6" />
                <span style={{ fontSize: "12px", color: "#555555" }}>{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
          >
            <Lock size={13} />
            Unlock with Pro
          </button>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
