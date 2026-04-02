import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_STATUSES = ["saved", "applied", "phone_screen", "interview", "offer", "rejected"] as const;
type KanbanStatus = (typeof VALID_STATUSES)[number];

const STATUS_TO_ACTION: Record<KanbanStatus, string> = {
  saved: "save",
  applied: "apply",
  phone_screen: "move_to_phone_screen",
  interview: "move_to_interview",
  offer: "move_to_offer",
  rejected: "move_to_rejected",
};

export async function PATCH(
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

  const { id: matchId } = await params;
  const body = await request.json();
  const { status } = body as { status: string };

  if (!VALID_STATUSES.includes(status as KanbanStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify ownership + get job_id for interaction log
  const { data: match } = await supabase
    .from("job_matches")
    .select("id, job_id")
    .eq("id", matchId)
    .eq("user_id", user.id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update status
  const { error } = await supabase
    .from("job_matches")
    .update({
      user_status: status,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Log to user_interactions
  await supabase.from("user_interactions").insert({
    user_id: user.id,
    job_id: match.job_id,
    action: STATUS_TO_ACTION[status as KanbanStatus],
  });

  return NextResponse.json({ success: true, status });
}
