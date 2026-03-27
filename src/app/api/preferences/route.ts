import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    target_roles,
    target_locations,
    min_salary,
    experience_level,
    remote_preference,
    excluded_companies,
    notify_email,
    notify_frequency,
  } = body;

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .update({
      target_roles,
      target_locations,
      min_salary,
      experience_level,
      remote_preference,
      excluded_companies,
      notify_email,
      notify_frequency,
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences });
}
