"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ParsedResume } from "@/lib/supabase/types";

interface ParsedEditorProps {
  resumeId: string;
  initialData: ParsedResume;
  onSave: () => void;
}

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
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={data.name || ""}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={data.email || ""}
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea
              value={data.summary || ""}
              onChange={(e) => setData({ ...data, summary: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.skills_flat.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20"
                onClick={() => removeSkill(skill)}
              >
                {skill} &times;
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <Button variant="outline" onClick={addSkill}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Target Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Target Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.target_roles_inferred.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className="cursor-pointer hover:bg-destructive/20"
                onClick={() => removeRole(role)}
              >
                {role} &times;
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a target role..."
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
            />
            <Button variant="outline" onClick={addRole}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.experience.map((exp, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
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
                  <Label>Company</Label>
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
              <div className="mt-2">
                <Label>Description</Label>
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
            <p className="text-sm text-muted-foreground">
              No experience entries found. This may affect matching quality.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.education.map((edu, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Institution</Label>
                <Input value={edu.institution ?? ""} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Degree</Label>
                <Input value={edu.degree ?? ""} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Field</Label>
                <Input value={edu.field ?? ""} readOnly className="bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    </div>
  );
}
