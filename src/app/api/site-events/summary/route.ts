import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  getModelKey,
  getSessionKey,
  inferAcquisitionFromFirstEvent,
  safeParseProps,
} from "@/lib/site-events";

/* ===========================
   Location normalization
   =========================== */

function decodeMaybe(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, "%20"));
  } catch {
    return raw;
  }
}

const COUNTRY_MAP: Record<string, string> = {
  MY: "Malaysia",
  MALAYSIA: "Malaysia",
  SG: "Singapore",
  SINGAPORE: "Singapore",
  US: "United States",
  USA: "United States",
  "UNITED STATES": "United States",
  ID: "Indonesia",
  INDONESIA: "Indonesia",
  IN: "India",
  INDIA: "India",
  GB: "United Kingdom",
  UK: "United Kingdom",
  "UNITED KINGDOM": "United Kingdom",
  AU: "Australia",
  AUSTRALIA: "Australia",
};

function normalizeCountry(v: unknown) {
  const s = decodeMaybe(v);
  if (!s) return "";
  const key = s.trim().toUpperCase();
  return COUNTRY_MAP[key] || s;
}

function normalizeRegion(v: unknown) {
  const s = decodeMaybe(v);
  if (!s) return "";
  if (/^\d+$/.test(s.trim())) return ""; // remove "14"
  return s;
}

function normalizeCity(v: unknown) {
  return decodeMaybe(v);
}

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

async function fetchRows(fromIso: string, toIso: string) {
  const { data, error } = await supabaseAdmin
    .from("site_events")
    .select(
      "id, created_at, event_name, page_path, page_url, referrer, session_id, anon_id, traffic_type, device_type, props, ip, country, region, city"
    )
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) throw new Error(error.message);
  return (data || []) as SiteEventRow[];
}

type Metrics = {
  activeUsersRealtime: number;
  pageViews: number;
  whatsappClicks: number;
  phoneClicks: number;

  traffic: { direct: number; organic: number; paid: number; referral: number };

  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];

  topCountries: { name: string; count: number }[];
  topRegions: { name: string; count: number }[];
  topCities: { name: string; count: number }[];

  trafficSeries: { t: string; v: number }[];

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

function computeMetrics(rows: SiteEventRow[]): Metrics {
  const now = Date.now();
  const realtimeWindowMs = 5 * 60 * 1000;
  const windowAgo = now - realtimeWindowMs;

  const sessionsInLast5m = new Set<string>();
  const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };

  let pageViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;

  const modelCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const trafficOverTime = new Map<string, number>();

  const campMap = new Map<
    string,
    { count: number; views: number; wa: number; calls: number }
  >();

  const countryCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();

  const sessionFirst = new Map<string, SiteEventRow>();
  for (const r of rows) {
    const sk = getSessionKey(r);
    if (!sessionFirst.has(sk)) sessionFirst.set(sk, r);
  }

  const sessionMeta = new Map<
    string,
    { traffic: keyof typeof traffic; campaign: string; refName: string }
  >();
  for (const [sk, first] of sessionFirst.entries()) {
    const a = inferAcquisitionFromFirstEvent(first);
    sessionMeta.set(sk, {
      traffic: a.traffic,
      campaign: a.campaign || "—",
      refName: a.refName,
    });
  }

  for (const r of rows) {
    const created = new Date(r.created_at).getTime();
    const sk = getSessionKey(r);

    if (!isNaN(created) && created >= windowAgo) sessionsInLast5m.add(sk);

    const meta = sessionMeta.get(sk);
    const t = (meta?.traffic || "direct") as keyof typeof traffic;
    traffic[t] = (traffic[t] || 0) + 1;

    const refName = meta?.refName || "Direct / None";
    refCounts.set(refName, (refCounts.get(refName) || 0) + 1);

    if (!isNaN(created)) {
      const hk = hourKeyUTC(new Date(created));
      trafficOverTime.set(hk, (trafficOverTime.get(hk) || 0) + 1);
    }

    const en = String(r.event_name || "").toLowerCase();
    if (en === "page_view") pageViews++;
    if (en === "whatsapp_click") whatsappClicks++;
    if (en === "phone_click") phoneClicks++;

    const modelKey = getModelKey(r);
    if (modelKey && modelKey !== "Unknown") {
      modelCounts.set(modelKey, (modelCounts.get(modelKey) || 0) + 1);
    }

    // ✅ normalized geo bucket keys
    const country = normalizeCountry((r as any).country) || "Unknown";
    const region = normalizeRegion((r as any).region) || "Unknown";
    const city = normalizeCity((r as any).city) || "Unknown";

    countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1);

    const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);
    const campKey = meta?.campaign ? meta.campaign : "Direct";
    const prev = campMap.get(campKey) || {
      count: 0,
      views: 0,
      wa: 0,
      calls: 0,
    };
    prev.count += 1;
    if (isCarDetail && (en === "page_view" || en === "site_load"))
      prev.views += 1;
    if (en === "whatsapp_click") prev.wa += 1;
    if (en === "phone_click") prev.calls += 1;
    campMap.set(campKey, prev);

    safeParseProps(r.props);
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

  const topCountries = Array.from(countryCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topRegions = Array.from(regionCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topCities = Array.from(cityCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    activeUsersRealtime: sessionsInLast5m.size,
    pageViews,
    whatsappClicks,
    phoneClicks,
    traffic,
    topModels,
    topReferrers,
    topCountries,
    topRegions,
    topCities,
    trafficSeries,
    campaigns,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "Missing from/to" },
        { status: 400 }
      );
    }

    const fromIso = toIsoSafe(from);
    const toIso = toIsoSafe(to);
    if (!fromIso || !toIso) {
      return NextResponse.json(
        { ok: false, error: "Invalid from/to" },
        { status: 400 }
      );
    }

    const rows = await fetchRows(fromIso, toIso);
    const current = computeMetrics(rows);

    return NextResponse.json({
      ok: true,
      range: { from: fromIso, to: toIso },
      ...current,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
