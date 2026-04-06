"use client";

import { useState, useCallback } from "react";

interface UploadFormProps {
  onUploadComplete: (data: {
    resumeId: string;
    confidence: string;
    flags: string[];
    parsed_data: unknown;
  }) => void;
}

export function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 5MB.");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Upload failed");
          return;
        }

        onUploadComplete(data);
      } catch {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
      <div
        className={`border-2 border-dashed rounded-[10px] p-8 text-center transition-colors ${
          isDragging
            ? "border-[#6366f1] bg-[#6366f110]"
            : "border-[#e8e8e8] hover:border-[#6366f180]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg
          className="mx-auto h-12 w-12 mb-4"
          style={{ color: "#cccccc" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <p style={{ fontSize: "15px", fontWeight: 500, color: "#111111", marginBottom: "4px" }}>
          {isUploading ? "Parsing your resume..." : "Drop your resume here"}
        </p>
        <p className="mb-4" style={{ fontSize: "13px", color: "#888888" }}>
          PDF only, max 5MB
        </p>

        {!isUploading && (
          <label className="cursor-pointer">
            <span
              className="inline-flex items-center justify-center rounded-[8px] border border-[#e8e8e8] bg-white hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              style={{ fontSize: "13px", fontWeight: 500, color: "#555555", padding: "6px 16px" }}
            >
              Browse Files
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        )}

        {isUploading && (
          <div className="flex items-center justify-center gap-2" style={{ color: "#888888" }}>
            <div className="h-4 w-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
            <span style={{ fontSize: "13px" }}>Extracting skills and experience...</span>
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 p-3 text-sm rounded-[8px]"
          style={{ background: "#dc262610", color: "#dc2626" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
