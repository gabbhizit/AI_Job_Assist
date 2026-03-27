import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, TailoringResult } from "./ai-provider";
import type { ParsedResume } from "@/lib/supabase/types";
import { RESUME_PARSE_PROMPT } from "./prompts/resume-parse";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  async parseResume(resumeText: string): Promise<ParsedResume> {
    const prompt = RESUME_PARSE_PROMPT.replace("{RESUME_TEXT}", resumeText);

    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText) as ParsedResume;
    return parsed;
  }

  async tailorResume(
    _resume: ParsedResume,
    _jobDescription: string
  ): Promise<TailoringResult> {
    // Future premium feature
    throw new Error("Resume tailoring is not yet implemented");
  }
}
