import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const minutes = Math.max(
    1,
    Math.min(60, Number(url.searchParams.get("minutes") || "5"))
  );
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const supabase = await createSupabaseServer();

  // pull recent sessions only
  const { data, error } = await supabase
    .from("site_events")
    .select("session_id")
    .gte("created_at", since)
    .not("session_id", "is", null)
    .limit(5000);

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );

  const set = new Set(
    (data ?? []).map((r: any) => r.session_id).filter(Boolean)
  );
  return NextResponse.json({ ok: true, minutes, active_users: set.size });
}
