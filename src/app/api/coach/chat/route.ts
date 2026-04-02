import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedResume } from "@/lib/supabase/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(resume: ParsedResume | null, visaStatus: string | null): string {
  const parts: string[] = [
    "You are an AI career coach specialising in helping international students (F-1 OPT / H-1B) land software engineering jobs in the US.",
    "Be concise, practical, and encouraging. Give specific, actionable advice.",
    "Keep responses under 200 words unless a detailed explanation is explicitly requested.",
  ];

  if (resume) {
    parts.push(`\nUser context:`);
    if (resume.name) parts.push(`- Name: ${resume.name}`);
    if (visaStatus) parts.push(`- Visa: ${visaStatus}`);
    if (resume.target_roles_inferred?.length) {
      parts.push(`- Target roles: ${resume.target_roles_inferred.slice(0, 4).join(", ")}`);
    }
    if (resume.total_years_experience) {
      parts.push(`- Experience: ${resume.total_years_experience} years`);
    }
    if (resume.skills_flat?.length) {
      parts.push(`- Top skills: ${resume.skills_flat.slice(0, 12).join(", ")}`);
    }
    if (resume.experience?.length) {
      const recent = resume.experience[0];
      parts.push(`- Most recent role: ${recent.title} at ${recent.company}`);
    }
    if (resume.highest_degree) {
      parts.push(`- Degree: ${resume.highest_degree}`);
    }
  }

  return parts.join("\n");
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const messages: ChatMessage[] = body.messages ?? [];

  if (!messages.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 });
  }

  // Load resume + profile context (fire in parallel, don't block on failure)
  const [resumeRes, profileRes] = await Promise.allSettled([
    supabase
      .from("resumes")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .eq("parsing_status", "completed")
      .single(),
    supabase
      .from("profiles")
      .select("visa_status")
      .eq("id", user.id)
      .single(),
  ]);

  const resume =
    resumeRes.status === "fulfilled"
      ? (resumeRes.value.data?.parsed_data as ParsedResume | null)
      : null;
  const visaStatus =
    profileRes.status === "fulfilled"
      ? (profileRes.value.data?.visa_status ?? null)
      : null;

  const systemPrompt = buildSystemPrompt(resume, visaStatus);

  // Stream response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
