// src/app/api/admin/site-events/summary/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  inferTrafficTypeEnhanced,
  referrerName,
  shouldCountModel,
  getModelKey,
} from "@/lib/site-events";

function toIsoSafe(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function hourKey(d: Date) {
  // "2025-12-30 08:00"
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Missing from/to" }, { status: 400 });
    }

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);
    if (!fromIso || !toIso) {
      return NextResponse.json({ ok: false, error: "Invalid from/to" }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    // Pull enough rows for analytics
    const { data, error } = await supabase
      .from("site_events")
      .select(
        "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data || []) as SiteEventRow[];

    // Realtime = active in last 5 minutes (based on events)
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const activeNowSessions = new Set<string>();

    // KPIs
    let pageViews = 0;
    let whatsappClicks = 0;
    let phoneClicks = 0;

    const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };

    // Top models
    const modelCounts = new Map<string, number>();

    // Referrers
    const refCounts = new Map<string, number>();

    // Traffic over time (hourly buckets)
    const trafficOverTime = new Map<string, number>();

    // Funnel (view → whatsapp): per model
    const modelViews = new Map<string, number>();
    const modelWhats = new Map<string, number>();

    for (const r of rows) {
      const t = inferTrafficTypeEnhanced(r) as keyof typeof traffic;
      traffic[t] = (traffic[t] || 0) + 1;

      const rn = referrerName(r.referrer);
      refCounts.set(rn, (refCounts.get(rn) || 0) + 1);

      const created = new Date(r.created_at);
      if (!isNaN(created.getTime())) {
        const hk = hourKey(created);
        trafficOverTime.set(hk, (trafficOverTime.get(hk) || 0) + 1);

        const sid = r.session_id || r.anon_id || "";
        if (sid && created.getTime() >= fiveMinAgo.getTime()) {
          activeNowSessions.add(sid);
        }
      }

      const en = String(r.event_name || "").toLowerCase();

      if (en === "page_view") pageViews++;
      if (en === "whatsapp_click") whatsappClicks++;
      if (en === "phone_click") phoneClicks++;

      if (shouldCountModel(r)) {
        const key = getModelKey(r);
        modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
      }

      // funnel by model: treat car detail views as "view"
      const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);
      if (isCarDetail && (en === "page_view" || en === "site_load")) {
        const key = getModelKey(r);
        modelViews.set(key, (modelViews.get(key) || 0) + 1);
      }
      if (isCarDetail && en === "whatsapp_click") {
        const key = getModelKey(r);
        modelWhats.set(key, (modelWhats.get(key) || 0) + 1);
      }
    }

    const topModels = Array.from(modelCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const topReferrers = Array.from(refCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Build a sorted series for chart (last 24 buckets max)
    const series = Array.from(trafficOverTime.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-48)
      .map(([k, v]) => ({ t: k, v }));

    const funnelTop = Array.from(modelViews.entries())
      .map(([model, views]) => {
        const wa = modelWhats.get(model) || 0;
        const rate = views > 0 ? wa / views : 0;
        return { model, views, whatsapp: wa, rate };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    return NextResponse.json({
      ok: true,
      activeUsersRealtime: activeNowSessions.size,
      pageViews,
      whatsappClicks,
      phoneClicks,
      traffic,
      topModels,
      topReferrers,
      trafficSeries: series,
      funnel: funnelTop,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
