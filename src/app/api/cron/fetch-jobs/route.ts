import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAndFilterJobs } from "@/lib/jobs/fetcher";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Vercel Pro: 60s max

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  try {
    const result = await fetchAndFilterJobs(supabase);
    return NextResponse.json({ status: "complete", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[fetch-jobs] fatal error:", message);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
