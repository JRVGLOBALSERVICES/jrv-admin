import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  getSessionKey,
  inferAcquisitionFromFirstEvent,
  getCampaignKeyFromSession,
  getModelKey,
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
  if (prev <= 0 && curr > 0) return 1;
  return (curr - prev) / prev;
}

function compareBlock(curr: any, prev: any) {
  const mk = (c: number, p: number) => ({ curr: c, prev: p, delta: c - p, pct: pctChange(c, p) });

  return {
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

function cleanIp(ip?: string | null) {
  if (!ip) return "";
  const s = String(ip).trim();
  if (!s) return "";
  if (s.includes(",")) return s.split(",")[0].trim();
  return s;
}

function isPublicIp(ip: string) {
  const x = String(ip || "").trim();
  if (!x) return false;
  if (x === "127.0.0.1" || x === "::1") return false;
  if (x.startsWith("10.")) return false;
  if (x.startsWith("192.168.")) return false;
  if (x.startsWith("172.")) {
    const p = Number(x.split(".")[1] || "0");
    if (p >= 16 && p <= 31) return false;
  }
  return true;
}

async function geoLookup(ip: string) {
  const safe = cleanIp(ip);
  if (!isPublicIp(safe)) return null;

  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(safe)}`, {
      cache: "no-store",
      headers: { "user-agent": "jrv-admin/1.0" },
    });
    const j: any = await r.json();
    if (!j || j.success === false) return null;
    return {
      country: j.country || null,
      region: j.region || j.state || null,
      city: j.city || null,
    };
  } catch {
    return null;
  }
}

async function enrichGeo(rows: SiteEventRow[]) {
  const ipNeed = new Set<string>();
  for (const r of rows) {
    if ((!r.country || !r.region || !r.city) && r.ip) {
      const ip = cleanIp(r.ip);
      if (ip) ipNeed.add(ip);
    }
    if (ipNeed.size >= 200) break;
  }

  const ipGeo = new Map<
    string,
    { country: string | null; region: string | null; city: string | null }
  >();

  await Promise.all(
    Array.from(ipNeed).map(async (ip) => {
      const g = await geoLookup(ip);
      if (g) ipGeo.set(ip, g);
    })
  );

  return rows.map((r) => {
    const ip = cleanIp(r.ip);
    const g = ipGeo.get(ip);
    return {
      ...r,
      country: r.country || g?.country || null,
      region: r.region || g?.region || null,
      city: r.city || g?.city || null,
    } as SiteEventRow;
  });
}

function applyRowFilters(
  rows: SiteEventRow[],
  filters: { event?: string; device?: string; path?: string }
) {
  const ev = (filters.event || "").trim().toLowerCase();
  const dev = (filters.device || "").trim().toLowerCase();
  const p = (filters.path || "").trim().toLowerCase();

  return rows.filter((r) => {
    if (ev && String(r.event_name || "").toLowerCase() !== ev) return false;
    if (dev && String(r.device_type || "").toLowerCase() !== dev) return false;
    if (p && !String(r.page_path || "").toLowerCase().includes(p)) return false;
    return true;
  });
}

async function fetchRows(fromIso: string, toIso: string) {
  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select(
      "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, ip, country, region, city"
    )
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);
  return (data || []) as SiteEventRow[];
}

async function fetchRealtimeActive() {
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select("session_id, anon_id, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", now.toISOString())
    .limit(5000);

  if (error) return 0;

  const s = new Set<string>();
  for (const r of data || []) {
    const key = (r as any).session_id || (r as any).anon_id || "";
    if (key) s.add(key);
  }
  return s.size;
}

function buildSessionMeta(metaRows: SiteEventRow[]) {
  const firstBySession = new Map<string, SiteEventRow>();
  const sorted = [...metaRows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const r of sorted) {
    const sk = getSessionKey(r);
    if (!firstBySession.has(sk)) firstBySession.set(sk, r);
  }

  const meta = new Map<
    string,
    { traffic: "direct" | "organic" | "paid" | "referral"; refName: string; campaign: string }
  >();

  for (const [sk, first] of firstBySession.entries()) {
    const acq = inferAcquisitionFromFirstEvent(first);
    const campaign =
      acq.traffic === "paid" ? getCampaignKeyFromSession(first) : "";

    meta.set(sk, {
      traffic: acq.traffic,
      refName: acq.refName || "Direct / None",
      campaign:
        acq.traffic === "paid"
          ? campaign && campaign !== "—" && campaign !== "-" ? campaign : "Google Ads"
          : "",
    });
  }

  return meta;
}

function computeMetrics(
  rowsInRange: SiteEventRow[],
  metaRows: SiteEventRow[],
  activeUsersRealtime: number,
  trafficFilter?: string
) {
  const sessionMeta = buildSessionMeta(metaRows);
  const tf = (trafficFilter || "").trim().toLowerCase();

  let pageViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;

  const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };

  const modelCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const trafficOverTime = new Map<string, number>();

  const campMap = new Map<
    string,
    { count: number; views: number; wa: number; calls: number }
  >();

  const countryByTraffic = {
    paid: new Map<string, number>(),
    organic: new Map<string, number>(),
    direct: new Map<string, number>(),
    referral: new Map<string, number>(),
  };

  const cityCounts = new Map<string, number>();

  for (const r of rowsInRange) {
    const sk = getSessionKey(r);
    const sm = sessionMeta.get(sk);

    const trafficFixed = (sm?.traffic || "direct") as
      | "direct"
      | "organic"
      | "paid"
      | "referral";

    if (tf && trafficFixed !== tf) continue;

    traffic[trafficFixed] = (traffic[trafficFixed] || 0) + 1;

    const refName =
      trafficFixed === "paid"
        ? "Google Ads"
        : sm?.refName || "Direct / None";

    refCounts.set(refName, (refCounts.get(refName) || 0) + 1);

    const created = new Date(r.created_at);
    if (!isNaN(created.getTime())) {
      const hk = hourKeyUTC(created);
      trafficOverTime.set(hk, (trafficOverTime.get(hk) || 0) + 1);
    }

    const en = String(r.event_name || "").toLowerCase();
    if (en === "page_view") pageViews++;
    if (en === "whatsapp_click") whatsappClicks++;
    if (en === "phone_click") phoneClicks++;

    const modelKey = getModelKey(r);
    const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);

    const countModel =
      en === "model_click" ||
      en === "whatsapp_click" ||
      en === "phone_click" ||
      ((en === "page_view" || en === "site_load") && isCarDetail);

    if (countModel && modelKey) {
      modelCounts.set(modelKey, (modelCounts.get(modelKey) || 0) + 1);
    }

    const campaignKey =
      trafficFixed === "paid"
        ? sm?.campaign || "Google Ads"
        : trafficFixed === "organic"
        ? "Organic"
        : trafficFixed === "referral"
        ? "Referral"
        : "Direct";

    const prev = campMap.get(campaignKey) || { count: 0, views: 0, wa: 0, calls: 0 };
    prev.count += 1;
    if (isCarDetail && (en === "page_view" || en === "site_load")) prev.views += 1;
    if (en === "whatsapp_click") prev.wa += 1;
    if (en === "phone_click") prev.calls += 1;
    campMap.set(campaignKey, prev);

    const country = (r.country || "").trim() || "Unknown";
    const region = (r.region || "").trim();
    const city = (r.city || "").trim();

    const bucket = trafficFixed as "paid" | "organic" | "direct" | "referral";
    countryByTraffic[bucket].set(country, (countryByTraffic[bucket].get(country) || 0) + 1);

    const cityKey = [city, region, country].filter(Boolean).join(", ") || "Unknown";
    cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
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

  const campaigns = Array.from(campMap.entries())
    .map(([campaign, v]) => {
      const conversions = v.wa + v.calls;
      const rate = v.views > 0 ? v.wa / v.views : 0;
      return {
        campaign: campaign || "N/A",
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

  const toTop = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  const topCountries = {
    paid: toTop(countryByTraffic.paid),
    organic: toTop(countryByTraffic.organic),
    direct: toTop(countryByTraffic.direct),
    referral: toTop(countryByTraffic.referral),
  };

  const topCities = Array.from(cityCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    activeUsersRealtime,
    pageViews,
    whatsappClicks,
    phoneClicks,
    traffic,
    topModels,
    topReferrers,
    trafficSeries,
    campaigns,
    topCountries,
    topCities,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    const filterEvent = url.searchParams.get("event") || "";
    const filterTraffic = url.searchParams.get("traffic") || "";
    const filterDevice = url.searchParams.get("device") || "";
    const filterPath = url.searchParams.get("path") || "";

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);
    if (!fromIso || !toIso) {
      return NextResponse.json({ ok: false, error: "Invalid from/to" }, { status: 400 });
    }

    const { from: fromD, ms } = clampRange(fromIso, toIso);
    const prevTo = new Date(fromD.getTime());
    const prevFrom = new Date(fromD.getTime() - ms);

    const metaFromIso = new Date(new Date(fromIso).getTime() - 6 * 60 * 60 * 1000).toISOString();
    const prevMetaFromIso = new Date(prevFrom.getTime() - 6 * 60 * 60 * 1000).toISOString();

    const [activeUsersRealtime, currRowsRaw, currMetaRaw, prevRowsRaw, prevMetaRaw] =
      await Promise.all([
        fetchRealtimeActive(),
        fetchRows(fromIso, toIso),
        fetchRows(metaFromIso, toIso),
        fetchRows(prevFrom.toISOString(), prevTo.toISOString()),
        fetchRows(prevMetaFromIso, prevTo.toISOString()),
      ]);

    const [currRowsGeo, currMetaGeo, prevRowsGeo, prevMetaGeo] = await Promise.all([
      enrichGeo(currRowsRaw),
      enrichGeo(currMetaRaw),
      enrichGeo(prevRowsRaw),
      enrichGeo(prevMetaRaw),
    ]);

    const currRows = applyRowFilters(currRowsGeo, { event: filterEvent, device: filterDevice, path: filterPath });
    const prevRows = applyRowFilters(prevRowsGeo, { event: filterEvent, device: filterDevice, path: filterPath });

    const current = computeMetrics(currRows, currMetaGeo, activeUsersRealtime, filterTraffic);
    const previous = computeMetrics(prevRows, prevMetaGeo, activeUsersRealtime, filterTraffic);

    return NextResponse.json({
      ok: true,
      range: { from: fromIso, to: toIso },
      prevRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      ...current,
      current,
      previous,
      compare: compareBlock(current, previous),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
