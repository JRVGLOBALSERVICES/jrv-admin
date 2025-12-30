// src/app/api/admin/site-events/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Missing from/to" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("site_events")
      .select(
        "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props"
      )
      .gte("created_at", new Date(from).toISOString())
      .lte("created_at", new Date(to).toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
