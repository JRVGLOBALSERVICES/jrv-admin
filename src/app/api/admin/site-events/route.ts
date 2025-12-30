// src/app/api/admin/site-events/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(2000, Math.max(50, Number(url.searchParams.get("limit") || 800)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Missing from/to" }, { status: 400 });
    }

    const fromIso = new Date(from).toISOString();
    const toIso = new Date(to).toISOString();

    const { data, error } = await supabaseAdmin
      .from("site_events")
      .select(
        "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, utm_campaign, utm_source, utm_medium, country, region, city, props"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, rows: data || [], limit, offset });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
