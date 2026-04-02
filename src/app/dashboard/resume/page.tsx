"use client";

import { useEffect, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { UploadForm } from "@/components/resume/upload-form";
import { ParsedEditor } from "@/components/resume/parsed-editor";
import { ConfidenceBanner } from "@/components/resume/confidence-banner";
import { ResumeDocument } from "@/components/resume/resume-document";
import { ResumeAtsPanel } from "@/components/resume/resume-ats-panel";
import { TailoredVersions } from "@/components/resume/tailored-versions";
import { CoverLetters } from "@/components/resume/cover-letters";
import { SkillsGap } from "@/components/resume/skills-gap";
import { Sheet } from "@/components/layout/sheet";
import { UpgradeModal } from "@/components/layout/upgrade-modal";
import type { ParsedResume } from "@/lib/supabase/types";

type Tab = "base" | "tailored" | "cover" | "skills";

interface ResumeData {
  id: string;
  parsed_data: ParsedResume | null;
  parsing_status: string;
  parsing_error: string | null;
  file_name: string;
  is_user_verified: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "base", label: "Base Resume" },
  { id: "tailored", label: "Tailored Versions" },
  { id: "cover", label: "Cover Letters" },
  { id: "skills", label: "Skills Gap" },
];

export default function ResumePage() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("base");
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    resumeId: string;
    confidence: "high" | "medium" | "low";
    flags: string[];
    parsed_data: ParsedResume;
  } | null>(null);

  const fetchResume = useCallback(async () => {
    const response = await fetch("/api/resume");
    const data = await response.json();
    setResume(data.resume);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const handleUploadComplete = (data: {
    resumeId: string;
    confidence: string;
    flags: string[];
    parsed_data: unknown;
  }) => {
    setUploadResult({
      resumeId: data.resumeId,
      confidence: data.confidence as "high" | "medium" | "low",
      flags: data.flags,
      parsed_data: data.parsed_data as ParsedResume,
    });
    setShowUploadSection(false);
  };

  const handleSaveAfterUpload = () => {
    setUploadResult(null);
    fetchResume();
  };

  const handleDocumentSaved = (updated: ParsedResume) => {
    if (resume) {
      setResume({ ...resume, parsed_data: updated });
    }
  };

  const handleEditSheetSave = () => {
    setShowEditSheet(false);
    fetchResume();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Post-upload review flow ─────────────────────────────────────────────
  if (uploadResult) {
    return (
      <div className="p-6 max-w-3xl space-y-5">
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
          Review Your Resume
        </h1>
        <ConfidenceBanner
          confidence={uploadResult.confidence}
          flags={uploadResult.flags}
        />
        <ParsedEditor
          resumeId={uploadResult.resumeId}
          initialData={uploadResult.parsed_data}
          onSave={handleSaveAfterUpload}
        />
      </div>
    );
  }

  // ── Completed resume → tab view ─────────────────────────────────────────
  if (resume?.parsed_data && resume.parsing_status === "completed") {
    const parsedData = resume.parsed_data;

    return (
      <>
        <div className="p-6 flex flex-col gap-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
                Resume & Materials
              </h1>
              <p style={{ fontSize: "13px", color: "#888888", marginTop: "2px" }}>
                {resume.file_name}
                {resume.is_user_verified && " · verified"}
              </p>
            </div>
            <button
              onClick={() => setShowUploadSection((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontSize: "13px", fontWeight: 500, color: "#555555" }}
            >
              <Upload size={13} />
              Upload new
            </button>
          </div>

          {/* Inline upload section */}
          {showUploadSection && (
            <div className="border border-[#e8e8e8] rounded-[12px] p-5">
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111", marginBottom: "12px" }}>
                Replace resume
              </p>
              <UploadForm onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {/* Confidence banner */}
          <ConfidenceBanner
            confidence={parsedData._parsing_confidence || "high"}
            flags={parsedData._flags || []}
          />

          {/* Tabs */}
          <div className="flex border-b border-[#f0f0f0]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 transition-colors relative"
                style={{
                  fontSize: "13px",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? "#6366f1" : "#888888",
                  borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "base" && (
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: "1fr 260px" }}
            >
              {/* Left: document view */}
              <ResumeDocument
                resume={parsedData}
                resumeId={resume.id}
                onSaved={handleDocumentSaved}
                onEditAll={() => setShowEditSheet(true)}
              />

              {/* Right: ATS panel */}
              <ResumeAtsPanel
                resume={parsedData}
                onUpgradeClick={() => setShowUpgrade(true)}
              />
            </div>
          )}

          {activeTab === "tailored" && (
            <TailoredVersions />
          )}

          {activeTab === "cover" && (
            <CoverLetters />
          )}

          {activeTab === "skills" && (
            <SkillsGap resume={parsedData} />
          )}
        </div>

        {/* Edit all fields sheet */}
        <Sheet
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          title="Edit Resume Fields"
          width="520px"
        >
          <div className="p-6">
            <ParsedEditor
              resumeId={resume.id}
              initialData={parsedData}
              onSave={handleEditSheetSave}
            />
          </div>
        </Sheet>

        {/* Upgrade modal */}
        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  // ── Parsing failed ───────────────────────────────────────────────────────
  if (resume?.parsing_status === "failed") {
    return (
      <div className="p-6 max-w-3xl space-y-6">
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111" }}>Resume</h1>
        <div className="p-4 bg-red-50 text-red-700 rounded-[10px]">
          <p className="font-medium">Parsing failed</p>
          <p className="text-sm mt-1">{resume.parsing_error}</p>
        </div>
        <UploadForm onUploadComplete={handleUploadComplete} />
      </div>
    );
  }

  // ── No resume uploaded yet ───────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
          Upload Your Resume
        </h1>
        <p style={{ fontSize: "13px", color: "#888888", marginTop: "4px" }}>
          Upload your resume to start getting personalised job matches. We&apos;ll extract your
          skills, experience, and education to find the best jobs for you.
        </p>
      </div>
      <UploadForm onUploadComplete={handleUploadComplete} />
    </div>
  );
}
