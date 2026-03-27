import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/ai-provider";
import { validateParsedResume } from "@/lib/ai/resume-validator";
import { extractTextFromPDF } from "@/lib/utils/pdf-parser";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be under 5MB" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // 2. Mark any existing primary resumes as non-primary
    await supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .eq("is_primary", true);

    // 3. Create resume record
    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        parsing_status: "processing",
        is_primary: true,
      })
      .select()
      .single();

    if (insertError || !resume) {
      return NextResponse.json(
        { error: "Failed to create resume record" },
        { status: 500 }
      );
    }

    // 4. Extract text from PDF
    let rawText: string;
    try {
      rawText = await extractTextFromPDF(buffer);
    } catch {
      await supabase
        .from("resumes")
        .update({
          parsing_status: "failed",
          parsing_error: "Failed to extract text from PDF. Please ensure it is a valid PDF file.",
        })
        .eq("id", resume.id);

      return NextResponse.json(
        {
          error: "Failed to extract text from PDF",
          resumeId: resume.id,
          status: "failed",
        },
        { status: 422 }
      );
    }

    // 5. Validate extracted text
    if (rawText.trim().length < 50) {
      await supabase
        .from("resumes")
        .update({
          raw_text: rawText,
          parsing_status: "failed",
          parsing_error:
            "PDF appears to be image-based or empty. Please upload a text-based PDF.",
        })
        .eq("id", resume.id);

      return NextResponse.json(
        {
          error: "PDF appears to be image-based or empty. Please upload a text-based PDF.",
          resumeId: resume.id,
          status: "failed",
        },
        { status: 422 }
      );
    }

    // 6. AI-powered parsing
    let parsedData;
    try {
      const aiProvider = getAIProvider();
      parsedData = await aiProvider.parseResume(rawText);
    } catch (error) {
      // Retry once
      try {
        const aiProvider = getAIProvider();
        parsedData = await aiProvider.parseResume(rawText);
      } catch {
        await supabase
          .from("resumes")
          .update({
            raw_text: rawText,
            parsing_status: "failed",
            parsing_error: `AI extraction failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try re-uploading.`,
          })
          .eq("id", resume.id);

        return NextResponse.json(
          {
            error: "AI extraction failed. Please try re-uploading.",
            resumeId: resume.id,
            status: "failed",
          },
          { status: 422 }
        );
      }
    }

    // 7. Validate parsed data
    const validation = validateParsedResume(parsedData);

    // 8. Store results
    await supabase
      .from("resumes")
      .update({
        raw_text: rawText,
        parsed_data: parsedData as unknown as Record<string, unknown>,
        parsing_status: "completed",
        parsing_error: null,
      })
      .eq("id", resume.id);

    return NextResponse.json({
      resumeId: resume.id,
      status: "completed",
      confidence: validation.confidence,
      flags: validation.flags,
      parsed_data: parsedData,
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
