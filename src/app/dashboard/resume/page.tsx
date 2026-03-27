"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadForm } from "@/components/resume/upload-form";
import { ParsedEditor } from "@/components/resume/parsed-editor";
import { ConfidenceBanner } from "@/components/resume/confidence-banner";
import type { ParsedResume } from "@/lib/supabase/types";

interface ResumeData {
  id: string;
  parsed_data: ParsedResume | null;
  parsing_status: string;
  parsing_error: string | null;
  file_name: string;
  is_user_verified: boolean;
}

export default function ResumePage() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
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
  };

  const handleSave = () => {
    setUploadResult(null);
    fetchResume();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show editor after fresh upload
  if (uploadResult) {
    return (
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Review Your Resume</h1>
        <ConfidenceBanner
          confidence={uploadResult.confidence}
          flags={uploadResult.flags}
        />
        <ParsedEditor
          resumeId={uploadResult.resumeId}
          initialData={uploadResult.parsed_data}
          onSave={handleSave}
        />
      </div>
    );
  }

  // Show existing parsed resume with edit option
  if (resume?.parsed_data && resume.parsing_status === "completed") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Resume</h1>
          <span className="text-sm text-muted-foreground">
            {resume.file_name}
            {resume.is_user_verified && " (verified)"}
          </span>
        </div>
        <ConfidenceBanner
          confidence={resume.parsed_data._parsing_confidence || "high"}
          flags={resume.parsed_data._flags || []}
        />
        <ParsedEditor
          resumeId={resume.id}
          initialData={resume.parsed_data}
          onSave={handleSave}
        />
        <div className="pt-4 border-t">
          <h2 className="text-lg font-semibold mb-3">Upload New Resume</h2>
          <UploadForm onUploadComplete={handleUploadComplete} />
        </div>
      </div>
    );
  }

  // Show error state
  if (resume?.parsing_status === "failed") {
    return (
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Resume</h1>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          <p className="font-medium">Parsing failed</p>
          <p className="text-sm mt-1">{resume.parsing_error}</p>
        </div>
        <UploadForm onUploadComplete={handleUploadComplete} />
      </div>
    );
  }

  // No resume uploaded yet
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Upload Your Resume</h1>
      <p className="text-muted-foreground">
        Upload your resume to start getting personalized job matches. We&apos;ll
        extract your skills, experience, and education to find the best jobs for
        you.
      </p>
      <UploadForm onUploadComplete={handleUploadComplete} />
    </div>
  );
}
