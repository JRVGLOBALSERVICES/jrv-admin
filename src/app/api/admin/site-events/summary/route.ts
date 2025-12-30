// src/app/api/admin/site-events/summary/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  inferTrafficTypeEnhanced,
  referrerLabel,
  shouldCountModel,
  getModelKey,
  getCampaignKeyRaw,
  getCampaignKey,
  isGoogleAdsHit,
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
  if (prev <= 0 && curr > 0) return 1; // treat as +100% (UI can label as "NEW")
  return (curr - prev) / prev;
}

function compareBlock(curr: any, prev: any) {
  const mk = (c: number, p: number) => ({ curr: c, prev: p, delta: c - p, pct: pctChange(c, p) });

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

  // ✅ geo
  topCountries: { traffic: "paid" | "organic" | "direct" | "referral"; country: string; count: number }[];
};

async function fetchRowsPaged(fromIso: string, toIso: string, hardCap = 20000) {
  const pageSize = 2000;
  let out: SiteEventRow[] = [];
  let offset = 0;

  while (out.length < hardCap) {
    const { data, error } = await supabaseAdmin
      .from("site_events")
      .select(
        "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, utm_campaign, utm_source, utm_medium, country, region, city, props"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = (data || []) as SiteEventRow[];
    out = out.concat(rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

/**
 * ✅ Session attribution:
 * - determine sessionCampaign from ANY event in session that has campaign (utm_campaign or gad_campaignid)
 * - apply it to all events in that session
 */
function buildSessionMaps(rows: SiteEventRow[]) {
  // sort oldest -> newest for stable "first seen" logic
  const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const sessionCampaign = new Map<string, string>();
  const sessionTraffic = new Map<string, "direct" | "organic" | "paid" | "referral">();

  for (const r of sorted) {
    const sid = String(r.session_id || r.anon_id || "").trim();
    if (!sid) continue;

    // traffic (once paid, stays paid)
    const t = inferTrafficTypeEnhanced(r);
    const prevT = sessionTraffic.get(sid);
    if (!prevT) sessionTraffic.set(sid, t);
    else if (prevT !== "paid" && t === "paid") sessionTraffic.set(sid, "paid");

    // campaign
    const ck = getCampaignKeyRaw(r);
    if (ck && !sessionCampaign.has(sid)) sessionCampaign.set(sid, ck);

    // if it's a google ads hit but campaign is still missing, try extracting gad_campaignid specifically
    if (!sessionCampaign.has(sid)) {
      const { hasAds, params } = isGoogleAdsHit(r);
      if (hasAds) {
        const gad = String(params.gad_campaignid || "").trim();
        if (gad) sessionCampaign.set(sid, `gad:${gad}`);
      }
    }
  }

  return { sessionCampaign, sessionTraffic };
}

function computeMetrics(rows: SiteEventRow[], opts?: { realtimeWindowMs?: number }): Metrics {
  const now = new Date();
  const windowMs = opts?.realtimeWindowMs ?? 5 * 60 * 1000;
  const windowAgo = new Date(now.getTime() - windowMs);

  const { sessionCampaign, sessionTraffic } = buildSessionMaps(rows);

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

  const campMap = new Map<string, { count: number; views: number; wa: number; calls: number }>();

  // geo counters by traffic
  const geoPaid = new Map<string, number>();
  const geoOrg = new Map<string, number>();
  const geoDir = new Map<string, number>();
  const geoRef = new Map<string, number>();

  for (const r of rows) {
    const created = new Date(r.created_at);
    const sid = String(r.session_id || r.anon_id || "").trim();
    const sessionCamp = sid ? sessionCampaign.get(sid) : "";
    const sessionT = sid ? sessionTraffic.get(sid) : undefined;

    // realtime sessions
    if (sid && !isNaN(created.getTime()) && created.getTime() >= windowAgo.getTime()) {
      activeSessions.add(sid);
    }

    // ✅ traffic uses session traffic if present
    const t = (sessionT || inferTrafficTypeEnhanced(r)) as keyof typeof traffic;
    traffic[t] = (traffic[t] || 0) + 1;

    // ✅ geo from columns (no geoip-lite)
    const country = String(r.country || "").trim() || "Unknown";
    if (t === "paid") geoPaid.set(country, (geoPaid.get(country) || 0) + 1);
    else if (t === "organic") geoOrg.set(country, (geoOrg.get(country) || 0) + 1);
    else if (t === "direct") geoDir.set(country, (geoDir.get(country) || 0) + 1);
    else geoRef.set(country, (geoRef.get(country) || 0) + 1);

    // referrer label
    const rn = referrerLabel(r);
    refCounts.set(rn, (refCounts.get(rn) || 0) + 1);

    // traffic series
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

    // funnel only on car detail pages
    const isCarDetail = !!String(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);
    if (isCarDetail && (en === "page_view" || en === "site_load")) {
      const key = getModelKey(r);
      modelViews.set(key, (modelViews.get(key) || 0) + 1);
    }
    if (isCarDetail && en === "whatsapp_click") {
      const key = getModelKey(r);
      modelWhats.set(key, (modelWhats.get(key) || 0) + 1);
    }

    // ✅ campaigns (session-attributed!)
    const campKey = getCampaignKey(r, sessionCamp || "");
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
      return { campaign, count: v.count, views: v.views, whatsapp: v.wa, calls: v.calls, conversions, rate };
    })
    .sort((a, b) => b.conversions - a.conversions || b.count - a.count)
    .slice(0, 20);

  const topCountries = (
    trafficKey: "paid" | "organic" | "direct" | "referral",
    m: Map<string, number>
  ) =>
    Array.from(m.entries())
      .map(([country, count]) => ({ traffic: trafficKey, country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

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
    topCountries: [
      ...topCountries("paid", geoPaid),
      ...topCountries("organic", geoOrg),
      ...topCountries("direct", geoDir),
      ...topCountries("referral", geoRef),
    ],
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

    const { from: fromD, ms } = clampRange(fromIso, toIso);

    // previous window: same duration immediately before from
    const prevTo = new Date(fromD.getTime());
    const prevFrom = new Date(fromD.getTime() - ms);

    const [currRows, prevRows] = await Promise.all([
      fetchRowsPaged(fromIso, toIso, 20000),
      fetchRowsPaged(prevFrom.toISOString(), prevTo.toISOString(), 20000),
    ]);

    const current = computeMetrics(currRows);
    const previous = computeMetrics(prevRows);

    return NextResponse.json({
      ok: true,
      range: { from: fromIso, to: toIso },
      prevRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },

      // keep existing fields
      ...current,

      // new blocks
      current,
      previous,
      compare: compareBlock(current, previous),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
