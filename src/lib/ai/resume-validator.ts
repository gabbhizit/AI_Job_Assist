import type { ParsedResume } from "@/lib/supabase/types";
import { normalizeSkills } from "@/lib/jobs/skills-dictionary";

export interface ValidationResult {
  confidence: "high" | "medium" | "low";
  flags: string[];
}

export function validateParsedResume(data: ParsedResume): ValidationResult {
  const flags: string[] = [];

  if (!data.name || data.name.trim() === "") {
    flags.push("missing_name");
  }

  if (!data.skills_flat || data.skills_flat.length === 0) {
    flags.push("no_skills_found");
  }

  if (!data.experience || data.experience.length === 0) {
    flags.push("missing_experience");
  }

  if (!data.education || data.education.length === 0) {
    flags.push("missing_education");
  }

  if (!data.highest_degree) {
    flags.push("missing_degree");
  }

  if (
    data.total_years_experience !== undefined &&
    (data.total_years_experience < 0 || data.total_years_experience > 30)
  ) {
    flags.push("suspicious_experience_years");
  }

  if (!data.email) {
    flags.push("missing_email");
  }

  // Normalize skills through the same dictionary used for JDs
  if (data.skills_flat && data.skills_flat.length > 0) {
    data.skills_flat = normalizeSkills(data.skills_flat);
  }

  // Also normalize skills in categories
  if (data.skills) {
    for (const category of Object.keys(data.skills) as (keyof typeof data.skills)[]) {
      if (Array.isArray(data.skills[category])) {
        data.skills[category] = normalizeSkills(data.skills[category]);
      }
    }
  }

  const confidence: ValidationResult["confidence"] =
    flags.length === 0 ? "high" : flags.length <= 2 ? "medium" : "low";

  // Attach metadata to the parsed data
  data._parsing_confidence = confidence;
  data._flags = flags;

  return { confidence, flags };
}
