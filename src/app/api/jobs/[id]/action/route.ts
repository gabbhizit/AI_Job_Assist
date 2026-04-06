import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const body = await request.json();
  const { action } = body as {
    action: "save" | "unsave" | "dismiss" | "undismiss" | "apply" | "click_apply_link";
  };

  const validActions = ["save", "unsave", "dismiss", "undismiss", "apply", "click_apply_link"];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Determine the new user_status
  let newStatus: "saved" | "dismissed" | "applied" | null = null;
  switch (action) {
    case "save":
      newStatus = "saved";
      break;
    case "dismiss":
      newStatus = "dismissed";
      break;
    case "apply":
      newStatus = "applied";
      break;
    case "unsave":
    case "undismiss":
      newStatus = null;
      break;
    case "click_apply_link":
      // Don't change status, just log
      break;
  }

  // Update job_matches status (except for click_apply_link)
  if (action !== "click_apply_link") {
    await supabase
      .from("job_matches")
      .update({
        user_status: newStatus,
        status_updated_at: new Date().toISOString(),
      })
      .match({ user_id: user.id, job_id: jobId });
  }

  // Log to user_interactions (append-only)
  await supabase.from("user_interactions").insert({
    user_id: user.id,
    job_id: jobId,
    action,
  });

  return NextResponse.json({ success: true, user_status: newStatus });
}
