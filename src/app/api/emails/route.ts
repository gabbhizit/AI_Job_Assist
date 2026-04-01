import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmailCategory } from "@/lib/supabase/types";

/**
 * GET /api/emails
 *
 * Returns paginated email_events for the authenticated user.
 *
 * Query params:
 *   category  — filter by category (optional)
 *   page      — 0-indexed page number (default: 0)
 *   limit     — results per page (default: 30, max: 50)
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as EmailCategory | null;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10)));
  const offset = page * limit;

  let query = supabase
    .from("email_events")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    emails: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
