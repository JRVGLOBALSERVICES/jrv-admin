import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function toIsoSafe(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * cursor format: "<created_at>|<id>"
 * helps stable pagination even when many rows share same timestamp
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limitRaw = Number(url.searchParams.get("limit") || "300");
    const limit = Math.min(Math.max(limitRaw, 50), 800);

    const cursor = url.searchParams.get("cursor") || "";
    const traffic = (url.searchParams.get("traffic") || "").toLowerCase(); // direct/organic/paid/referral
    const session = url.searchParams.get("session") || "";
    const campaign = url.searchParams.get("campaign") || ""; // e.g. "gad:234..." or "utm:abc"

    if (!from || !to) return NextResponse.json({ ok: false, error: "Missing from/to" }, { status: 400 });

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);
    if (!fromIso || !toIso) return NextResponse.json({ ok: false, error: "Invalid from/to" }, { status: 400 });

    let q = supabaseAdmin
      .from("site_events")
      .select("id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, utm_campaign")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    // cursor pagination
    if (cursor.includes("|")) {
      const [cAt, cId] = cursor.split("|");
      // created_at desc: fetch older than cursor
      q = q.or(`created_at.lt.${cAt},and(created_at.eq.${cAt},id.lt.${cId})`);
    }

    // optional session filter
    if (session) q = q.eq("session_id", session);

    // traffic filter works if you stored traffic_type; else client can compute
    if (traffic && ["direct", "organic", "paid", "referral"].includes(traffic)) {
      q = q.eq("traffic_type", traffic);
    }

    // campaign filter: only works if utm_campaign column has it or page_url contains it.
    // (strongly recommended: store campaign into utm_campaign column at insert time)
    if (campaign.startsWith("utm:")) {
      const v = campaign.replace("utm:", "");
      q = q.eq("utm_campaign", v);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = data || [];
    const last = rows[rows.length - 1];
    const nextCursor = last ? `${last.created_at}|${last.id}` : null;

    return NextResponse.json({ ok: true, rows, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
