"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedResume } from "@/lib/supabase/types";

interface ParsedEditorProps {
  resumeId: string;
  initialData: ParsedResume;
  onSave: () => void;
}

const sectionTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#111111",
  marginBottom: "16px",
  paddingBottom: "12px",
  borderBottom: "1px solid #f0f0f0",
};

const fieldLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "#888888",
  marginBottom: "4px",
};

export function ParsedEditor({ resumeId, initialData, onSave }: ParsedEditorProps) {
  const [data, setData] = useState<ParsedResume>(initialData);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [roleInput, setRoleInput] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, parsed_data: data }),
      });
      if (response.ok) {
        onSave();
      }
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !data.skills_flat.includes(skill.toLowerCase())) {
      setData({
        ...data,
        skills_flat: [...data.skills_flat, skill.toLowerCase()],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setData({
      ...data,
      skills_flat: data.skills_flat.filter((s) => s !== skill),
    });
  };

  const addRole = () => {
    const role = roleInput.trim();
    if (role && !data.target_roles_inferred.includes(role)) {
      setData({
        ...data,
        target_roles_inferred: [...data.target_roles_inferred, role],
      });
      setRoleInput("");
    }
  };

  const removeRole = (role: string) => {
    setData({
      ...data,
      target_roles_inferred: data.target_roles_inferred.filter((r) => r !== role),
    });
  };

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
        <div style={sectionTitle}>Basic Information</div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p style={fieldLabel}>Name</p>
              <Input
                value={data.name || ""}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div>
              <p style={fieldLabel}>Email</p>
              <Input
                value={data.email || ""}
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <p style={fieldLabel}>Summary</p>
            <Textarea
              value={data.summary || ""}
              onChange={(e) => setData({ ...data, summary: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
        <div style={sectionTitle}>Skills</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.skills_flat.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full cursor-pointer hover:bg-[#ececec] transition-colors"
              style={{ fontSize: "12px", background: "#f5f5f5", border: "1px solid #e8e8e8", padding: "3px 10px", color: "#555555" }}
              onClick={() => removeSkill(skill)}
            >
              {skill}
              <span style={{ fontSize: "14px", color: "#aaaaaa", lineHeight: 1 }}>&times;</span>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          />
          <button
            onClick={addSkill}
            className="flex-shrink-0 border border-[#e8e8e8] rounded-[8px] hover:bg-[#f5f5f5] transition-colors"
            style={{ fontSize: "13px", fontWeight: 500, color: "#555555", padding: "0 14px" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Target Roles */}
      <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
        <div style={sectionTitle}>Target Roles</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.target_roles_inferred.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full cursor-pointer hover:bg-[#ececec] transition-colors"
              style={{ fontSize: "12px", background: "#f5f5f5", border: "1px solid #e8e8e8", padding: "3px 10px", color: "#555555" }}
              onClick={() => removeRole(role)}
            >
              {role}
              <span style={{ fontSize: "14px", color: "#aaaaaa", lineHeight: 1 }}>&times;</span>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a target role..."
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
          />
          <button
            onClick={addRole}
            className="flex-shrink-0 border border-[#e8e8e8] rounded-[8px] hover:bg-[#f5f5f5] transition-colors"
            style={{ fontSize: "13px", fontWeight: 500, color: "#555555", padding: "0 14px" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
        <div style={sectionTitle}>Experience</div>
        <div className="space-y-4">
          {data.experience.map((exp, i) => (
            <div key={i}>
              {i > 0 && <div style={{ borderTop: "1px solid #f0f0f0", marginBottom: "16px" }} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p style={fieldLabel}>Title</p>
                  <Input
                    value={exp.title ?? ""}
                    onChange={(e) => {
                      const updated = [...data.experience];
                      updated[i] = { ...updated[i], title: e.target.value };
                      setData({ ...data, experience: updated });
                    }}
                  />
                </div>
                <div>
                  <p style={fieldLabel}>Company</p>
                  <Input
                    value={exp.company ?? ""}
                    onChange={(e) => {
                      const updated = [...data.experience];
                      updated[i] = { ...updated[i], company: e.target.value };
                      setData({ ...data, experience: updated });
                    }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <p style={fieldLabel}>Description</p>
                <Textarea
                  value={exp.description ?? ""}
                  onChange={(e) => {
                    const updated = [...data.experience];
                    updated[i] = { ...updated[i], description: e.target.value };
                    setData({ ...data, experience: updated });
                  }}
                  rows={3}
                />
              </div>
            </div>
          ))}
          {data.experience.length === 0 && (
            <p style={{ fontSize: "13px", color: "#888888" }}>
              No experience entries found. This may affect matching quality.
            </p>
          )}
        </div>
      </div>

      {/* Education */}
      <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5">
        <div style={sectionTitle}>Education</div>
        <div className="space-y-4">
          {data.education.map((edu, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p style={fieldLabel}>Institution</p>
                <Input value={edu.institution ?? ""} readOnly className="bg-[#f7f8fc]" />
              </div>
              <div>
                <p style={fieldLabel}>Degree</p>
                <Input value={edu.degree ?? ""} readOnly className="bg-[#f7f8fc]" />
              </div>
              <div>
                <p style={fieldLabel}>Field</p>
                <Input value={edu.field ?? ""} readOnly className="bg-[#f7f8fc]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[8px] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ fontSize: "13px", fontWeight: 500, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "9px 24px" }}
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
