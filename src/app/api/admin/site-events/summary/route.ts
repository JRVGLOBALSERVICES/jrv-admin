import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SiteEventRow } from "@/lib/site-events";
import {
  getSessionKey,
  inferAcquisitionFromFirstEvent,
  getCampaignKeyFromSession,
  getModelKey,
} from "@/lib/site-events";

function cleanLabel(v: any) {
  return String(v ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

const COUNTRY_ALIASES: Record<string, string> = {
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
  AE: "United Arab Emirates",
  UAE: "United Arab Emirates",
  "UNITED ARAB EMIRATES": "United Arab Emirates",
  DE: "Germany",
  GERMANY: "Germany",
};

function normalizeCountry(raw: any) {
  const s = cleanLabel(raw);
  if (!s) return "";
  const key = s.toUpperCase();
  return COUNTRY_ALIASES[key] || s;
}

// Helper to extract country from Exact Address
function extractCountryFromAddr(addr: string | null) {
  if (!addr) return null;
  const parts = addr.split(",").map((s) => s.trim());
  if (parts.length > 0) {
    return normalizeCountry(parts[parts.length - 1]);
  }
  return null;
}

function isJunkToken(s: string) {
  const x = cleanLabel(s);
  if (!x) return true;
  if (x.length <= 1) return true;
  if (/^\d+$/.test(x)) return true;
  if (/^[\d\s.,:_-]+$/.test(x)) return true;
  if (/^(unknown|undefined|null|na|n\/a)$/i.test(x)) return true;
  if (/^(my|jk)$/i.test(x)) return true;
  return false;
}

function normalizeCityKey(cityRaw: any, regionRaw: any, countryRaw: any, exactAddr?: string | null) {
  if (exactAddr) {
    const parts = exactAddr.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      const country = normalizeCountry(parts[parts.length - 1]);
      let city = parts[0];
      if (parts.length >= 4) city = parts[parts.length - 3];
      return cleanLabel(`${city}, ${country}`);
    }
  }
  const city0 = cleanLabel(cityRaw);
  const country0 = cleanLabel(countryRaw);
  const city = city0.split(",")[0] || city0;
  const country = normalizeCountry(country0);
  if (!city || isJunkToken(city)) return "";
  if (!country || isJunkToken(country)) return "";
  return cleanLabel(`${city}, ${country}`);
}

function normalizeRegionKey(regionRaw: any, cityRaw: any, countryRaw: any, exactAddr?: string | null) {
  if (exactAddr) {
    const parts = exactAddr.split(",").map((s) => s.trim());
    if (parts.length >= 3) {
      const country = normalizeCountry(parts[parts.length - 1]);
      let region = parts[parts.length - 2].replace(/\d+/g, "").trim();
      if (region && country) return cleanLabel(region);
    }
  }
  const region0 = cleanLabel(regionRaw);
  if (region0 && !isJunkToken(region0) && !/\d/.test(region0)) return region0;
  return "";
}

function incCanonical(map: Map<string, { name: string; count: number }>, label: string) {
  const clean = cleanLabel(label);
  if (!clean || isJunkToken(clean)) return;
  const key = clean.toLowerCase();
  const prev = map.get(key);
  if (prev) prev.count += 1;
  else map.set(key, { name: clean, count: 1 });
}

function topFromCanonical(map: Map<string, { name: string; count: number }>, limit: number) {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function hourKeyUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

function computeMetrics(rowsInRange: SiteEventRow[]) {
  let pageViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;
  const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };
  const modelCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const trafficOverTime = new Map<string, number>();
  const campMap = new Map<string, any>();
  const countryByTraffic = {
    paid: new Map<string, number>(),
    organic: new Map<string, number>(),
    direct: new Map<string, number>(),
    referral: new Map<string, number>(),
  };
  const cityCanonical = new Map<string, { name: string; count: number }>();
  const regionCanonical = new Map<string, { name: string; count: number }>();
  
  // ✅ ISP Counter
  const ispCounts = new Map<string, number>();

  // Process Sessions
  const sessionFirst = new Map<string, SiteEventRow>();
  const sorted = [...rowsInRange].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (const r of sorted) {
    const sk = getSessionKey(r);
    if (!sessionFirst.has(sk)) sessionFirst.set(sk, r);
  }
  const sessionMeta = new Map<string, any>();
  for (const [sk, first] of sessionFirst.entries()) {
    const acq = inferAcquisitionFromFirstEvent(first);
    const campaign = acq.traffic === "paid" ? getCampaignKeyFromSession(first) : "";
    sessionMeta.set(sk, {
      traffic: acq.traffic,
      refName: acq.refName || "Direct / None",
      campaign: acq.traffic === "paid" && campaign && campaign !== "—" ? campaign : "Google Ads",
    });
  }

  for (const r of rowsInRange) {
    const sk = getSessionKey(r);
    const sm = sessionMeta.get(sk);
    const trafficFixed = (sm?.traffic || "direct") as "direct"|"organic"|"paid"|"referral";

    traffic[trafficFixed] = (traffic[trafficFixed] || 0) + 1;
    const refName = trafficFixed === "paid" ? "Google Ads" : sm?.refName || "Direct / None";
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
    if (modelKey && modelKey !== "Unknown") modelCounts.set(modelKey, (modelCounts.get(modelKey) || 0) + 1);

    const campaignKey = trafficFixed === "paid" ? sm?.campaign || "Google Ads" : trafficFixed === "organic" ? "Organic" : trafficFixed === "referral" ? "Referral" : "Direct";
    const prev = campMap.get(campaignKey) || { count: 0, views: 0, wa: 0, calls: 0 };
    prev.count += 1;
    if (en === "whatsapp_click") prev.wa += 1;
    if (en === "phone_click") prev.calls += 1;
    campMap.set(campaignKey, prev);

    let country = normalizeCountry(r.country) || "Unknown";
    if (r.exact_address) {
      const extracted = extractCountryFromAddr(r.exact_address);
      if (extracted) country = extracted;
    }

    const cityKey = normalizeCityKey(r.city, r.region, r.country, r.exact_address);
    const regionKey = normalizeRegionKey(r.region, r.city, r.country, r.exact_address);

    const bucket = trafficFixed as "paid" | "organic" | "direct" | "referral";
    if (country !== "Unknown" && !isJunkToken(country)) {
      countryByTraffic[bucket].set(country, (countryByTraffic[bucket].get(country) || 0) + 1);
    }
    if (cityKey) incCanonical(cityCanonical, cityKey);
    if (regionKey) incCanonical(regionCanonical, regionKey);

    // ✅ Aggregating ISP
    const ispName = r.isp ? String(r.isp).trim() : "Unknown";
    if (ispName !== "Unknown") {
      ispCounts.set(ispName, (ispCounts.get(ispName) || 0) + 1);
    }
  }

  const topModels = Array.from(modelCounts.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  const topReferrers = Array.from(refCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 20);
  const trafficSeries = Array.from(trafficOverTime.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1)).slice(-48).map(([t, v]) => ({ t, v }));
  const campaigns = Array.from(campMap.entries()).map(([campaign, v]) => ({ campaign: campaign || "N/A", ...v, conversions: v.wa + v.calls, rate: v.views > 0 ? v.wa / v.views : 0 })).sort((a, b) => b.conversions - a.conversions || b.count - a.count).slice(0, 20);
  const toTop = (m: Map<string, number>) => Array.from(m.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  const topIsps = Array.from(ispCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    pageViews, whatsappClicks, phoneClicks, traffic, topModels, topReferrers, trafficSeries, campaigns, topIsps,
    topCountries: { paid: toTop(countryByTraffic.paid), organic: toTop(countryByTraffic.organic), direct: toTop(countryByTraffic.direct), referral: toTop(countryByTraffic.referral) },
    topCities: topFromCanonical(cityCanonical, 15),
    topRegions: topFromCanonical(regionCanonical, 10),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    const { data: currRowsRaw } = await supabaseAdmin
      .from("site_events") // ✅ Live Table
      .select("*, isp")
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(5000);

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { count: activeUsersRealtime } = await supabaseAdmin.from("site_events").select("session_id", { count: "exact", head: true }).gte("created_at", fiveMinAgo);

    // ✅ FETCH LATEST GPS
    const { data: latestGps } = await supabaseAdmin
      .from("site_events")
      .select("id, created_at, exact_address, city, region, country, lat, lng, isp")
      .not("exact_address", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    const current = computeMetrics(currRowsRaw || []);

    return NextResponse.json({
      ok: true,
      activeUsersRealtime: activeUsersRealtime || 0,
      latestGps: latestGps || [], // ✅ Included
      ...current,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}