"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
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
      if (file && file.type === "application/pdf") {
        handleUpload(file);
      } else {
        setError("Please upload a PDF file");
      }
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
    <Card>
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground mb-4"
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
          <p className="text-lg font-medium mb-1">
            {isUploading ? "Parsing your resume..." : "Drop your resume here"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            PDF only, max 5MB
          </p>

          {!isUploading && (
            <label className="cursor-pointer">
              <span className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted hover:text-foreground cursor-pointer">
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
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Extracting skills and experience...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
