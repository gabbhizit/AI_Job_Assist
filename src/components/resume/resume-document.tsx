"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { ParsedResume } from "@/lib/supabase/types";

interface EditingBullet {
  expIdx: number;
  bulletIdx: number;
}

interface ResumeDocumentProps {
  resume: ParsedResume;
  resumeId: string;
  onSaved: (updated: ParsedResume) => void;
  onEditAll?: () => void;
}

function parseBullets(description: string): string[] {
  return description
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function serializeBullets(bullets: string[]): string {
  return bullets.map((b) => `- ${b}`).join("\n");
}

export function ResumeDocument({ resume, resumeId, onSaved, onEditAll }: ResumeDocumentProps) {
  const [editingBullet, setEditingBullet] = useState<EditingBullet | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (expIdx: number, bulletIdx: number, text: string) => {
    setEditingBullet({ expIdx, bulletIdx });
    setEditText(text);
  };

  const cancelEdit = () => {
    setEditingBullet(null);
    setEditText("");
  };

  const saveBullet = async () => {
    if (!editingBullet) return;
    const { expIdx, bulletIdx } = editingBullet;

    const updatedResume: ParsedResume = JSON.parse(JSON.stringify(resume));
    const bullets = parseBullets(updatedResume.experience[expIdx].description);
    bullets[bulletIdx] = editText.trim() || bullets[bulletIdx];
    updatedResume.experience[expIdx].description = serializeBullets(bullets);

    setSaving(true);
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, parsed_data: updatedResume }),
      });
      if (res.ok) {
        onSaved(updatedResume);
      }
    } finally {
      setSaving(false);
      cancelEdit();
    }
  };

  const handleBulletKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveBullet();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  const visaLabels: Record<string, string> = {
    f1_opt: "F1/OPT",
    h1b: "H1B",
    citizen: "US Citizen",
    green_card: "Green Card",
    other: "Work Auth",
  };

  return (
    <div
      className="border border-[#e8e8e8] rounded-[12px] bg-white overflow-hidden"
      style={{ fontFamily: "Georgia, serif" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0]"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <p style={{ fontSize: "12px", color: "#aaaaaa" }}>Resume Preview</p>
        {onEditAll && (
          <button
            onClick={onEditAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
            style={{ fontSize: "12px", fontWeight: 500, color: "#555555", fontFamily: "system-ui, sans-serif" }}
          >
            <Pencil size={12} />
            Edit all fields
          </button>
        )}
      </div>

      {/* Document body */}
      <div className="p-7">
        {/* Header */}
        <div className="mb-5 pb-4 border-b border-[#e8e8e8]">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111111", letterSpacing: "-0.02em", fontFamily: "Georgia, serif" }}>
            {resume.name || "Your Name"}
          </h1>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5"
            style={{ fontSize: "12px", color: "#666666", fontFamily: "system-ui, sans-serif" }}
          >
            {resume.email && <span>{resume.email}</span>}
            {resume.phone && <><span style={{ color: "#d0d0d0" }}>·</span><span>{resume.phone}</span></>}
            {resume.linkedin && (
              <>
                <span style={{ color: "#d0d0d0" }}>·</span>
                <a
                  href={resume.linkedin.startsWith("http") ? resume.linkedin : `https://${resume.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  {resume.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </>
            )}
          </div>
          {resume.target_roles_inferred?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" style={{ fontFamily: "system-ui, sans-serif" }}>
              {resume.target_roles_inferred.slice(0, 3).map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: "11px", color: "#6366f1", background: "#6366f110" }}
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {resume.summary && (
          <div className="mb-5">
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#aaaaaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px", fontFamily: "system-ui, sans-serif" }}>
              Summary
            </h2>
            <p style={{ fontSize: "13px", color: "#444444", lineHeight: 1.65 }}>{resume.summary}</p>
          </div>
        )}

        {/* Experience */}
        {(resume.experience?.length ?? 0) > 0 && (
          <div className="mb-5">
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#aaaaaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "system-ui, sans-serif" }}>
              Experience
            </h2>
            <div className="flex flex-col gap-5">
              {resume.experience.map((exp, expIdx) => {
                const bullets = parseBullets(exp.description);
                return (
                  <div key={expIdx}>
                    <div className="flex items-start justify-between gap-2 mb-1" style={{ fontFamily: "system-ui, sans-serif" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>{exp.title}</p>
                        <p style={{ fontSize: "12px", color: "#666666" }}>{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                      </div>
                      <p style={{ fontSize: "11px", color: "#aaaaaa", whiteSpace: "nowrap", marginTop: "2px" }}>
                        {formatDate(exp.start_date)} — {exp.is_current ? "Present" : formatDate(exp.end_date)}
                      </p>
                    </div>

                    {/* Bullets */}
                    <ul style={{ paddingLeft: "16px", marginTop: "6px" }}>
                      {bullets.map((bullet, bulletIdx) => {
                        const isEditing =
                          editingBullet?.expIdx === expIdx &&
                          editingBullet?.bulletIdx === bulletIdx;

                        return (
                          <li
                            key={bulletIdx}
                            className="group relative"
                            style={{ fontSize: "13px", color: "#444444", lineHeight: 1.6, marginBottom: "4px", listStyleType: "disc" }}
                          >
                            {isEditing ? (
                              <div className="flex items-start gap-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                                <textarea
                                  autoFocus
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={handleBulletKeyDown}
                                  className="flex-1 border border-[#6366f1] rounded-[6px] px-2 py-1 text-[13px] resize-none outline-none"
                                  style={{ color: "#111111", lineHeight: 1.5, minHeight: "56px" }}
                                  rows={2}
                                />
                                <div className="flex flex-col gap-1 pt-0.5">
                                  <button
                                    onClick={saveBullet}
                                    disabled={saving}
                                    className="p-1 rounded-[4px] hover:bg-[#f0fdf4] transition-colors"
                                    title="Save (Enter)"
                                  >
                                    <Check size={13} color="#16a34a" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 rounded-[4px] hover:bg-[#fef2f2] transition-colors"
                                    title="Cancel (Esc)"
                                  >
                                    <X size={13} color="#dc2626" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-[#f5f5f5] rounded px-0.5 transition-colors relative"
                                onClick={() => startEdit(expIdx, bulletIdx, bullet)}
                                title="Click to edit"
                              >
                                {bullet}
                                <span
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 inline-flex items-center"
                                  style={{ fontFamily: "system-ui, sans-serif" }}
                                >
                                  <Pencil size={10} color="#aaaaaa" />
                                </span>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {/* Technologies */}
                    {exp.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                        {exp.technologies.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded"
                            style={{ fontSize: "10px", color: "#888888", background: "#f5f5f5" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Education */}
        {(resume.education?.length ?? 0) > 0 && (
          <div className="mb-5">
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#aaaaaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "system-ui, sans-serif" }}>
              Education
            </h2>
            <div className="flex flex-col gap-3">
              {resume.education.map((edu, i) => (
                <div key={i} className="flex items-start justify-between gap-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>{edu.institution}</p>
                    <p style={{ fontSize: "12px", color: "#666666" }}>
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
                      {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                    </p>
                    {edu.coursework?.length > 0 && (
                      <p style={{ fontSize: "11px", color: "#aaaaaa", marginTop: "2px" }}>
                        {edu.coursework.slice(0, 4).join(", ")}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: "11px", color: "#aaaaaa", whiteSpace: "nowrap", marginTop: "2px" }}>
                    {formatDate(edu.start_date)} — {edu.is_current ? "Present" : formatDate(edu.end_date)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {(resume.projects?.length ?? 0) > 0 && (
          <div className="mb-5">
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#aaaaaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "system-ui, sans-serif" }}>
              Projects
            </h2>
            <div className="flex flex-col gap-3">
              {resume.projects.map((proj, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "system-ui, sans-serif" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>{proj.name}</p>
                    {proj.url && (
                      <a
                        href={proj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "11px", color: "#6366f1" }}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#555555", marginTop: "2px", lineHeight: 1.55 }}>{proj.description}</p>
                  {proj.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5" style={{ fontFamily: "system-ui, sans-serif" }}>
                      {proj.technologies.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded"
                          style={{ fontSize: "10px", color: "#888888", background: "#f5f5f5" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {(resume.skills_flat?.length ?? 0) > 0 && (
          <div>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#aaaaaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", fontFamily: "system-ui, sans-serif" }}>
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5" style={{ fontFamily: "system-ui, sans-serif" }}>
              {resume.skills_flat.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-full border border-[#e8e8e8]"
                  style={{ fontSize: "11px", color: "#444444", background: "#fafafa" }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
