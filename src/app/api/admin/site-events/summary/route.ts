// src/app/api/admin/site-events/summary/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  inferTrafficTypeEnhanced,
  referrerLabel,
  shouldCountModel,
  getModelKey,
  getCampaignKey,
} from "@/lib/site-events";

function toIsoSafe(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function hourKeyUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

function clampRange(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const ms = Math.max(1, to.getTime() - from.getTime());
  return { from, to, ms };
}

function pctChange(curr: number, prev: number) {
  if (prev <= 0 && curr <= 0) return 0;
  if (prev <= 0 && curr > 0) return 1; // "infinite" growth → treat as +100% (you can show special label)
  return (curr - prev) / prev;
}

function compareBlock(curr: any, prev: any) {
  // returns deltas for key fields
  const mk = (c: number, p: number) => ({
    curr: c,
    prev: p,
    delta: c - p,
    pct: pctChange(c, p),
  });

  return {
    activeUsersRealtime: mk(curr.activeUsersRealtime, prev.activeUsersRealtime),
    pageViews: mk(curr.pageViews, prev.pageViews),
    whatsappClicks: mk(curr.whatsappClicks, prev.whatsappClicks),
    phoneClicks: mk(curr.phoneClicks, prev.phoneClicks),

    traffic: {
      direct: mk(curr.traffic.direct, prev.traffic.direct),
      organic: mk(curr.traffic.organic, prev.traffic.organic),
      paid: mk(curr.traffic.paid, prev.traffic.paid),
      referral: mk(curr.traffic.referral, prev.traffic.referral),
    },
  };
}

type Metrics = {
  activeUsersRealtime: number;
  pageViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];
  trafficSeries: { t: string; v: number }[];
  funnel: { model: string; views: number; whatsapp: number; rate: number }[];
  campaigns: {
    campaign: string;
    count: number;
    views: number;
    whatsapp: number;
    calls: number;
    conversions: number;
    rate: number;
  }[];
};

async function fetchRows(fromIso: string, toIso: string) {
  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select(
      "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props"
    )
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);
  return (data || []) as SiteEventRow[];
}

function computeMetrics(rows: SiteEventRow[], opts?: { realtimeWindowMs?: number }): Metrics {
  const now = new Date();
  const windowMs = opts?.realtimeWindowMs ?? 5 * 60 * 1000;
  const windowAgo = new Date(now.getTime() - windowMs);

  const activeSessions = new Set<string>();
  let pageViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;

  const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };

  const modelCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const trafficOverTime = new Map<string, number>();

  const modelViews = new Map<string, number>();
  const modelWhats = new Map<string, number>();

  const campMap = new Map<
    string,
    { count: number; views: number; wa: number; calls: number }
  >();

  for (const r of rows) {
    // realtime sessions (only counts events in last N minutes of this dataset window)
    const created = new Date(r.created_at);
    const sid = r.session_id || r.anon_id || "";
    if (sid && !isNaN(created.getTime()) && created.getTime() >= windowAgo.getTime()) {
      activeSessions.add(sid);
    }

    const t = inferTrafficTypeEnhanced(r) as keyof typeof traffic;
    traffic[t] = (traffic[t] || 0) + 1;

    const rn = referrerLabel(r);
    refCounts.set(rn, (refCounts.get(rn) || 0) + 1);

    if (!isNaN(created.getTime())) {
      const hk = hourKeyUTC(created);
      trafficOverTime.set(hk, (trafficOverTime.get(hk) || 0) + 1);
    }

    const en = String(r.event_name || "").toLowerCase();
    if (en === "page_view") pageViews++;
    if (en === "whatsapp_click") whatsappClicks++;
    if (en === "phone_click") phoneClicks++;

    if (shouldCountModel(r)) {
      const key = getModelKey(r);
      modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
    }

    // funnel
    const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);
    if (isCarDetail && (en === "page_view" || en === "site_load")) {
      const key = getModelKey(r);
      modelViews.set(key, (modelViews.get(key) || 0) + 1);
    }
    if (isCarDetail && en === "whatsapp_click") {
      const key = getModelKey(r);
      modelWhats.set(key, (modelWhats.get(key) || 0) + 1);
    }

    // campaigns
    const campKey = getCampaignKey(r) || "—";
    const prev = campMap.get(campKey) || { count: 0, views: 0, wa: 0, calls: 0 };
    prev.count += 1;
    if (isCarDetail && (en === "page_view" || en === "site_load")) prev.views += 1;
    if (en === "whatsapp_click") prev.wa += 1;
    if (en === "phone_click") prev.calls += 1;
    campMap.set(campKey, prev);
  }

  const topModels = Array.from(modelCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topReferrers = Array.from(refCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const trafficSeries = Array.from(trafficOverTime.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .slice(-48)
    .map(([t, v]) => ({ t, v }));

  const funnel = Array.from(modelViews.entries())
    .map(([model, views]) => {
      const wa = modelWhats.get(model) || 0;
      const rate = views > 0 ? wa / views : 0;
      return { model, views, whatsapp: wa, rate };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const campaigns = Array.from(campMap.entries())
    .map(([campaign, v]) => {
      const conversions = v.wa + v.calls;
      const rate = v.views > 0 ? v.wa / v.views : 0;
      return {
        campaign,
        count: v.count,
        views: v.views,
        whatsapp: v.wa,
        calls: v.calls,
        conversions,
        rate,
      };
    })
    .sort((a, b) => b.conversions - a.conversions || b.count - a.count)
    .slice(0, 20);

  return {
    activeUsersRealtime: activeSessions.size,
    pageViews,
    whatsappClicks,
    phoneClicks,
    traffic,
    topModels,
    topReferrers,
    trafficSeries,
    funnel,
    campaigns,
  };
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

    const { from: fromD, to: toD, ms } = clampRange(fromIso, toIso);

    // previous window: same duration immediately before from
    const prevTo = new Date(fromD.getTime());
    const prevFrom = new Date(fromD.getTime() - ms);

    const [currRows, prevRows] = await Promise.all([
      fetchRows(fromIso, toIso),
      fetchRows(prevFrom.toISOString(), prevTo.toISOString()),
    ]);

    const current = computeMetrics(currRows);
    const previous = computeMetrics(prevRows);

    return NextResponse.json({
      ok: true,
      range: { from: fromIso, to: toIso },
      prevRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },

      // keep existing top-level fields so your UI doesn't break
      ...current,

      // ✅ new blocks
      current,
      previous,
      compare: compareBlock(current, previous),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
