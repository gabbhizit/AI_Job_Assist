import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateParsedResume } from "@/lib/ai/resume-validator";
import { NextResponse } from "next/server";
import type { ParsedResume } from "@/lib/supabase/types";

// GET - Fetch current primary resume
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .single();

  return NextResponse.json({ resume });
}

// PUT - Update parsed resume data (user edits)
export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { resumeId, parsed_data } = body as {
    resumeId: string;
    parsed_data: ParsedResume;
  };

  if (!resumeId || !parsed_data) {
    return NextResponse.json(
      { error: "Missing resumeId or parsed_data" },
      { status: 400 }
    );
  }

  // Re-validate after user edits
  const validation = validateParsedResume(parsed_data);

  const { error } = await supabase
    .from("resumes")
    .update({
      parsed_data: parsed_data as unknown as Record<string, unknown>,
      is_user_verified: true,
    })
    .eq("id", resumeId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update resume" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    confidence: validation.confidence,
    flags: validation.flags,
  });
}
