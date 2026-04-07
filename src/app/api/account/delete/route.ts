import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Delete resume files from storage before removing DB rows
  const { data: resumes } = await serviceClient
    .from("resumes")
    .select("file_path")
    .eq("user_id", user.id);

  if (resumes && resumes.length > 0) {
    const paths = resumes
      .map((r: { file_path: string | null }) => r.file_path)
      .filter(Boolean) as string[];
    if (paths.length > 0) {
      await serviceClient.storage.from("resumes").remove(paths);
    }
  }

  // Delete user data in dependency order
  await serviceClient.from("user_interactions").delete().eq("user_id", user.id);
  await serviceClient.from("job_matches").delete().eq("user_id", user.id);
  await serviceClient.from("resumes").delete().eq("user_id", user.id);
  await serviceClient.from("user_preferences").delete().eq("user_id", user.id);
  await serviceClient.from("profiles").delete().eq("id", user.id);

  // Delete the auth user (must be last)
  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
