import type { ParsedResume } from "@/lib/supabase/types";

export interface TailoringResult {
  skills_to_emphasize: string[];
  bullet_rewrites: { original: string; suggested: string; reason: string }[];
  missing_keywords: string[];
  summary_suggestion: string | null;
}

export interface AIProvider {
  parseResume(resumeText: string): Promise<ParsedResume>;
  tailorResume(
    resume: ParsedResume,
    jobDescription: string
  ): Promise<TailoringResult>;
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "claude";
  switch (provider) {
    case "claude": {
      const { ClaudeProvider } = require("./claude-provider");
      return new ClaudeProvider();
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
