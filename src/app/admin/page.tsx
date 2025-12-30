import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import ExpiringSoon from "../admin/_components/ExpiringSoon";
import AvailableNow from "../admin/_components/AvailableNow";
import AvailableTomorrow from "../admin/_components/AvailableTomorrow";
import CurrentlyRented from "../admin/_components/CurrentlyRented";
import DashboardFilters from "../admin/_components/DashboardFilters";
import MiniSiteAnalytics from "./_components/MiniSiteAnalytics";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "JRV Admin Overview",
  path: "/admin",
  index: false,
});

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all"
  | "custom";

type AgreementLite = {
  id: string;
  customer_name?: string | null;
  car_type: string | null;
  plate_number: string | null;
  mobile: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
};

type MiniSummary = {
  activeUsersRealtime: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];
  topCountries: { name: string; count: number }[];
  topRegions: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
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

/* ===========================
   Date Helpers
   =========================== */
function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
}
function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1, 0, 0, 0, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}
function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
function diffDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

/* ===========================
   Model normalization
   =========================== */
function normalizeModel(rawName: string | null) {
  if (!rawName) return "Unknown";
  const lower = rawName.toLowerCase().trim();
  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) return "Perodua Myvi";
  if (lower.includes("axia")) return "Perodua Axia";
  if (lower.includes("alza")) return "Perodua Alza";
  if (lower.includes("aruz")) return "Perodua Aruz";
  if (lower.includes("ativa")) return "Perodua Ativa";
  if (lower.includes("saga")) return "Proton Saga";
  if (lower.includes("person")) return "Proton Persona";
  if (lower.includes("exora")) return "Proton Exora";
  if (lower.includes("x50")) return "Proton X50";
  if (lower.includes("x70")) return "Proton X70";
  if (lower.includes("x90")) return "Proton X90";
  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("yaris")) return "Toyota Yaris";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  if (lower.includes("innova")) return "Toyota Innova";
  if (lower.includes("city")) return "Honda City";
  if (lower.includes("civic")) return "Honda Civic";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("crv") || lower.includes("cr-v")) return "Honda CR-V";
  if (lower.includes("xpander")) return "Mitsubishi Xpander";
  if (lower.includes("triton")) return "Mitsubishi Triton";
  return rawName.replace(/\b\w/g, (l) => l.toUpperCase());
}
function getBrand(model: string) {
  return model.split(" ")[0] || "Other";
}

/* ===========================
   Range logic
   =========================== */
function getRange(
  period: Period,
  fromParam: string,
  toParam: string,
  now = new Date()
) {
  if (period === "custom" && fromParam && toParam) {
    const s = new Date(fromParam);
    const e = new Date(toParam);
    if (isValidDate(s) && isValidDate(e)) {
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }

  if (period === "all") return { start: new Date(0), end: now };

  let start: Date;
  if (period === "daily") start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  else if (period === "weekly") start = startOfWeekMonday(now);
  else if (period === "monthly") start = startOfMonth(now);
  else if (period === "quarterly") start = startOfQuarter(now);
  else if (period === "yearly") start = startOfYear(now);
  else start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return { start, end: now };
}

/* ===========================
   Supabase relation helper
   =========================== */
function pickCatalog(rel: any): { make?: any; model?: any } {
  if (!rel) return {};
  if (Array.isArray(rel)) return rel[0] ?? {};
  return rel;
}

/* ===========================
   KL timezone helpers (UTC instants)
   =========================== */
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

function startOfDayInKLToUTC(baseUtc: Date) {
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  const klMidnight = new Date(
    kl.getFullYear(),
    kl.getMonth(),
    kl.getDate(),
    0,
    0,
    0,
    0
  );
  return new Date(klMidnight.getTime() - KL_OFFSET_MS);
}
function endOfDayInKLToUTC(baseUtc: Date) {
  const start = startOfDayInKLToUTC(baseUtc);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
function addDaysKL(baseUtc: Date, days: number) {
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  kl.setDate(kl.getDate() + days);
  return new Date(kl.getTime() - KL_OFFSET_MS);
}

/* ===========================
   Site events helpers (gad_campaignid only)
   =========================== */
function safeJson(v: any) {
  try {
    if (!v) return {};
    if (typeof v === "object") return v;
    if (typeof v === "string") return JSON.parse(v);
    return {};
  } catch {
    return {};
  }
}

// ✅ safe for null page_url
function parseUrlParamsSafe(pageUrl: string | null | undefined) {
  const out: Record<string, string> = {};
  if (!pageUrl) return out;
  try {
    const u = new URL(pageUrl);
    u.searchParams.forEach((val, key) => {
      out[key] = val;
    });
    return out;
  } catch {
    // handle relative URLs like "/?gad_campaignid=..."
    try {
      const u = new URL(pageUrl, "https://example.com");
      u.searchParams.forEach((val, key) => {
        out[key] = val;
      });
      return out;
    } catch {
      return out;
    }
  }
}

function isGoogleRef(referrer: string | null | undefined) {
  if (!referrer) return false;
  const r = referrer.toLowerCase();
  return r.includes("google.");
}

// ✅ your request: prefer utm_campaign else gad_campaignid (only)
function getCampaignKeyFromUrlParams(p: Record<string, string>) {
  const utm = (p["utm_campaign"] || "").trim();
  if (utm) return `utm:${utm}`;
  const gad = (p["gad_campaignid"] || "").trim();
  if (gad) return `gad:${gad}`;
  return "—";
}

// ✅ Split referrer label: Google Ads vs Google Organic
function referrerLabelGadOnly(
  referrer: string | null | undefined,
  pageUrl: string | null | undefined
) {
  const p = parseUrlParamsSafe(pageUrl);
  const hasGad = !!(p["gad_campaignid"] || "").trim();

  if (isGoogleRef(referrer)) {
    return hasGad ? "Google Ads" : "Google (Organic)";
  }

  if (!referrer) return "Direct / None";
  try {
    const u = new URL(referrer);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return (
      String(referrer)
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0] || "Direct / None"
    );
  }
}

function inferTrafficTypeGadOnly(
  referrer: string | null | undefined,
  pageUrl: string | null | undefined
) {
  const p = parseUrlParamsSafe(pageUrl);
  const hasGad = !!(p["gad_campaignid"] || "").trim();
  if (hasGad) return "paid" as const;
  if (isGoogleRef(referrer)) return "organic" as const;
  if (!referrer) return "direct" as const;
  return "referral" as const;
}

function inferCarFromPath(page_path: string | null) {
  if (!page_path) return null;
  const m = page_path.match(/^\/cars\/([^/]+)\/?$/i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1] || "");
  const parts = slug.split("-");
  if (parts.length < 2) return { make: "", model: slug.replace(/-/g, " ") };
  return { make: parts[0], model: parts.slice(1).join(" ").trim() };
}

/* ===========================
   MAIN
   =========================== */
export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    model?: string;
    plate?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const period = (sp.period as Period) || "daily";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const fromParam = sp.from || "";
  const toParam = sp.to || "";

  const { start, end } = getRange(period, fromParam, toParam, new Date());
  const supabase = await createSupabaseServer();

  // -------------------------
  // ✅ MINI SITE ANALYTICS (last 24h rolling)
  // -------------------------
  const now2 = new Date();
  const last24h = new Date(now2.getTime() - 24 * 60 * 60 * 1000);
  const last5m = new Date(now2.getTime() - 5 * 60 * 1000);

  const { data: siteEvents24h } = await supabase
    .from("site_events")
    .select(
      "created_at, event_name, session_id, anon_id, page_path, page_url, props, referrer, ip, country, region, city"
    )
    .gte("created_at", last24h.toISOString())
    .lte("created_at", now2.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  const events = (siteEvents24h ?? []) as any[];

  const active5mSet = new Set<string>();
  let whatsappClicks24h = 0;
  let phoneClicks24h = 0;

  const trafficCounts = { direct: 0, organic: 0, paid: 0, referral: 0 };
  const modelCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();

  const campaignAgg = new Map<
    string,
    { count: number; views: number; wa: number; calls: number }
  >();

  const sessionFirst = new Map<string, any>();
  for (const e of events) {
    const sid = e.session_id || e.anon_id || "unknown";
    if (!sessionFirst.has(sid)) sessionFirst.set(sid, e);
  }

  const sessionMeta = new Map<
    string,
    {
      traffic: "direct" | "organic" | "paid" | "referral";
      refLabel: string;
      campaignKey: string;
    }
  >();

  for (const [sid, first] of sessionFirst.entries()) {
    const firstParams = parseUrlParamsSafe(first.page_url);
    const firstCampaignKey = getCampaignKeyFromUrlParams(firstParams);

    const traffic = inferTrafficTypeGadOnly(first.referrer, first.page_url);
    const refLabel = referrerLabelGadOnly(first.referrer, first.page_url);

    const campaignKey =
      traffic === "paid"
        ? firstCampaignKey === "—"
          ? "Google Ads"
          : firstCampaignKey
        : traffic === "organic"
        ? "Google (Organic)"
        : traffic === "direct"
        ? "Direct"
        : refLabel || "Referral";

    sessionMeta.set(sid, { traffic, refLabel, campaignKey });
  }

  for (const e of events) {
    const sid = e.session_id || e.anon_id || "unknown";
    const meta = sessionMeta.get(sid);

    const createdAt = new Date(e.created_at).getTime();
    if (!Number.isNaN(createdAt) && createdAt >= last5m.getTime()) {
      active5mSet.add(sid);
    }

    const en = String(e.event_name || "").toLowerCase();
    if (en === "whatsapp_click") whatsappClicks24h++;
    if (en === "phone_click") phoneClicks24h++;

    const t = (meta?.traffic || "direct") as keyof typeof trafficCounts;
    trafficCounts[t] += 1;

    const rLabel = meta?.refLabel || "Direct / None";
    refCounts.set(rLabel, (refCounts.get(rLabel) || 0) + 1);

    const ctry = String(e.country || "").trim() || "Unknown";
    const reg = String(e.region || "").trim() || "Unknown";
    const cty = String(e.city || "").trim() || "Unknown";

    countryCounts.set(ctry, (countryCounts.get(ctry) || 0) + 1);
    regionCounts.set(reg, (regionCounts.get(reg) || 0) + 1);
    cityCounts.set(cty, (cityCounts.get(cty) || 0) + 1);

    const looksLikeCarDetail = !!inferCarFromPath(e.page_path);

    const props = safeJson(e.props);
    let make = String(props?.make || "").trim();
    let model = String(props?.model || "").trim();

    if (!model) {
      const inferred = inferCarFromPath(e.page_path);
      if (inferred?.model) {
        make = make || inferred.make || "";
        model = inferred.model;
      }
    }

    const shouldCountModel =
      en === "model_click" ||
      en === "whatsapp_click" ||
      en === "phone_click" ||
      ((en === "page_view" || en === "site_load") && looksLikeCarDetail);

    if (shouldCountModel && model) {
      const key = `${make ? make + " " : ""}${model}`.trim();
      modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
    }

    const campaignKey = meta?.campaignKey || "Direct";
    const prev = campaignAgg.get(campaignKey) || {
      count: 0,
      views: 0,
      wa: 0,
      calls: 0,
    };

    prev.count += 1;
    if (looksLikeCarDetail && (en === "page_view" || en === "site_load"))
      prev.views += 1;
    if (en === "whatsapp_click") prev.wa += 1;
    if (en === "phone_click") prev.calls += 1;

    campaignAgg.set(campaignKey, prev);
  }

  const topModels24h = Array.from(modelCounts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topReferrers24h = Array.from(refCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topCountries24h = Array.from(countryCounts.entries())
    .filter(([name]) => name !== "Unknown")
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topRegions24h = Array.from(regionCounts.entries())
    .filter(([name]) => name !== "Unknown")
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topCities24h = Array.from(cityCounts.entries())
    .filter(([name]) => name !== "Unknown")
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const campaigns24h = Array.from(campaignAgg.entries())
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

  const summary: MiniSummary = {
    activeUsersRealtime: active5mSet.size,
    whatsappClicks: whatsappClicks24h,
    phoneClicks: phoneClicks24h,
    traffic: trafficCounts,
    topModels: topModels24h,
    topReferrers: topReferrers24h,
    topCountries: topCountries24h,
    topRegions: topRegions24h,
    topCities: topCities24h,
    campaigns: campaigns24h,
  };

  // -------------------------
  // Filters dropdown data (based on agreements history)
  // -------------------------
  const { data: allAgreements } = await supabase
    .from("agreements")
    .select("car_type, plate_number")
    .limit(3000);

  const uniqueModels = Array.from(
    new Set(
      (allAgreements ?? [])
        .map((a) => normalizeModel(a.car_type))
        .filter(Boolean)
    )
  ) as string[];

  const uniquePlates = Array.from(
    new Set((allAgreements ?? []).map((a) => a.plate_number).filter(Boolean))
  ) as string[];

  uniqueModels.sort();
  uniquePlates.sort();

  // -------------------------
  // Revenue query
  // -------------------------
  let query = supabase
    .from("agreements")
    .select(
      "id, customer_name, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .order("date_start", { ascending: false });

  if (period !== "all") {
    query = query
      .gte("date_start", safeISO(start))
      .lte("date_start", safeISO(end));
  }
  if (filterPlate) query = query.eq("plate_number", filterPlate);

  const { data: revenueData, error } = await query.limit(5000);
  if (error)
    return <div className="p-6 text-red-600">Error: {error.message}</div>;

  let rows = (revenueData ?? []) as AgreementLite[];
  if (filterModel)
    rows = rows.filter((r) => normalizeModel(r.car_type) === filterModel);

  // -------------------------
  // Analytics (Revenue)
  // -------------------------
  let totalRevenue = 0;
  let totalDaysRented = 0;

  const byModel = new Map<
    string,
    { count: number; revenue: number; days: number }
  >();
  const byPlate = new Map<
    string,
    { count: number; revenue: number; model: string }
  >();
  const byBrand = new Map<string, { revenue: number }>();

  for (const r of rows) {
    const rev = Number(r.total_price) || 0;
    const days = diffDays(r.date_start, r.date_end);
    const model = normalizeModel(r.car_type);
    const brand = getBrand(model);
    const plate = r.plate_number || "Unknown";

    totalRevenue += rev;
    totalDaysRented += days;

    const m = byModel.get(model) || { count: 0, revenue: 0, days: 0 };
    m.count += 1;
    m.revenue += rev;
    m.days += days;
    byModel.set(model, m);

    const p = byPlate.get(plate) || { count: 0, revenue: 0, model };
    p.count += 1;
    p.revenue += rev;
    byPlate.set(plate, p);

    const b = byBrand.get(brand) || { revenue: 0 };
    b.revenue += rev;
    byBrand.set(brand, b);
  }

  const breakdownModel = Array.from(byModel.entries())
    .map(([k, v]) => ({ key: k, ...v, adr: v.revenue / (v.days || 1) }))
    .sort((a, b) => b.revenue - a.revenue);

  const breakdownPlate = Array.from(byPlate.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const breakdownBrand = Array.from(byBrand.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const bookingCount = rows.length;
  const avgDailyRate = totalDaysRented > 0 ? totalRevenue / totalDaysRented : 0;
  const avgLength = bookingCount > 0 ? totalDaysRented / bookingCount : 0;
  const maxModelRev = breakdownModel[0]?.revenue || 1;

  // -------------------------
  // Cards data
  // -------------------------
  const now = new Date();

  const todayStartUTC = startOfDayInKLToUTC(now);
  const todayEndUTC = endOfDayInKLToUTC(now);

  const { data: expiringToday } = await supabase
    .from("agreements")
    .select(
      "id, customer_name, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .gte("date_end", todayStartUTC.toISOString())
    .lte("date_end", todayEndUTC.toISOString())
    .order("date_end", { ascending: true })
    .limit(5000);

  const { data: carsBase } = await supabase
    .from("cars")
    .select(
      "id, plate_number, status, location, catalog_rel:catalog_id ( make, model )"
    )
    .order("plate_number", { ascending: true })
    .limit(5000);

  const nowIso = now.toISOString();
  const { data: activeNow } = await supabase
    .from("agreements")
    .select(
      "id, customer_name, mobile, car_id, plate_number, car_type, date_start, date_end, status"
    )
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .lte("date_start", nowIso)
    .gt("date_end", nowIso)
    .not("car_id", "is", null)
    .order("date_end", { ascending: true })
    .limit(5000);

  const busyCarIds = new Set(
    (activeNow ?? []).map((a: any) => a?.car_id).filter(Boolean)
  );

  const availableNowRows =
    (carsBase ?? [])
      .filter(
        (c: any) => c?.status === "available" && c?.id && !busyCarIds.has(c.id)
      )
      .map((c: any) => {
        const cat = pickCatalog(c?.catalog_rel);
        const make = String(cat?.make ?? "").trim();
        const model = String(cat?.model ?? "").trim();
        return {
          id: c.id,
          plate_number: c.plate_number,
          location: c.location,
          car_label: [make, model].filter(Boolean).join(" ").trim(),
        };
      }) ?? [];

  const currentlyRentedRows =
    (activeNow ?? []).map((ag: any) => {
      const car = (carsBase ?? []).find((c: any) => c?.id === ag.car_id);
      const cat = pickCatalog(car?.catalog_rel);
      const make = String(cat?.make ?? "").trim();
      const model = String(cat?.model ?? "").trim();

      return {
        agreement_id: ag.id,
        car_id: ag.car_id,
        plate_number: ag.plate_number || car?.plate_number || "—",
        car_label:
          ag.car_type || [make, model].filter(Boolean).join(" ").trim() || "—",
        customer_name: ag.customer_name ?? null,
        mobile: ag.mobile ?? null,
        date_end: ag.date_end ?? null,
        status: ag.status ?? null,
      };
    }) ?? [];

  const tomorrowBase = addDaysKL(now, 1);
  const tomorrowStartUTC = startOfDayInKLToUTC(tomorrowBase);
  const tomorrowEndUTC = endOfDayInKLToUTC(tomorrowBase);

  const availableTomorrowRows = (currentlyRentedRows ?? []).filter((r: any) => {
    const endT = r?.date_end ? new Date(r.date_end).getTime() : NaN;
    return (
      Number.isFinite(endT) &&
      endT >= tomorrowStartUTC.getTime() &&
      endT <= tomorrowEndUTC.getTime()
    );
  });

  const availableCount = availableNowRows.length;
  const rentedCount = currentlyRentedRows.length;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-500 font-medium">
            {period === "all"
              ? "All Time"
              : period === "custom"
              ? "Custom Range"
              : `This ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-20 bg-white rounded-xl border animate-pulse" />
          }
        >
          <DashboardFilters plates={uniquePlates} models={uniqueModels} />
        </Suspense>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Revenue
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {fmtMoney(totalRevenue)}
          </div>
          <div className="text-xs text-green-600 mt-1 font-medium">
            {bookingCount} bookings
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Days Rented
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {totalDaysRented}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">
            days total
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Avg Daily Rate
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {fmtMoney(avgDailyRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">per day</div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Avg Length
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {avgLength.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">
            days / trip
          </div>
        </div>
      </div>

      {/* ✅ Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Top Performing Cars</h3>
            <span className="text-xs bg-black text-white px-2 py-1 rounded">
              By Plate
            </span>
          </div>
          <div className="divide-y">
            {breakdownPlate.map((p, i) => (
              <div
                key={p.key}
                className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">{p.key}</div>
                    <div className="text-xs text-gray-500">{p.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">
                    {fmtMoney(p.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">{p.count} trips</div>
                </div>
              </div>
            ))}
            {breakdownPlate.length === 0 && (
              <div className="p-6 text-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-3">
            {breakdownBrand.map((b) => (
              <div
                key={b.key}
                className="bg-white border shadow-sm rounded-lg px-4 py-2 flex items-center gap-3"
              >
                <span className="font-semibold text-gray-700">{b.key}</span>
                <div className="h-4 w-px bg-gray-200"></div>
                <span className="text-emerald-600 font-bold">
                  {fmtMoney(b.revenue)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Revenue by Model</h3>
              <div className="text-xs text-gray-500">Includes ADR</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 w-1/3">Model</th>
                    <th className="px-4 py-3 text-right">Performance</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Trips</th>
                    <th className="px-4 py-3 text-right">ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {breakdownModel.map((b) => {
                    const percent = (b.revenue / maxModelRev) * 100;
                    return (
                      <tr key={b.key} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {b.key}
                        </td>
                        <td className="px-4 py-3 w-1/4 align-middle">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {fmtMoney(b.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {b.count}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 font-medium bg-gray-50/50">
                          {fmtMoney(b.adr)}
                        </td>
                      </tr>
                    );
                  })}

                  {breakdownModel.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOW summary is real */}
      <MiniSiteAnalytics
        activeUsers={summary.activeUsersRealtime}
        whatsappClicks={summary.whatsappClicks}
        phoneClicks={summary.phoneClicks}
        traffic={summary.traffic}
        topModels={summary.topModels}
        topReferrers={summary.topReferrers}
        topCountries={summary.topCountries}
        topRegions={summary.topRegions}
        topCities={summary.topCities}
      />

      {/* ✅ ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ExpiringSoon
          title="Expiring Today ⏳"
          subtitle="All agreements ending today"
          rows={(expiringToday ?? []) as any}
        />

        <AvailableNow
          title="Available Now ✅"
          rows={availableNowRows as any}
          availableCount={availableCount}
          rentedCount={rentedCount}
        />

        <AvailableTomorrow
          title="Available Tomorrow 📅"
          rows={availableTomorrowRows as any}
        />
      </div>

      {/* ✅ ROW 2 */}
      <div className="grid grid-cols-1">
        <CurrentlyRented
          title="Currently Rented 🚗"
          rows={currentlyRentedRows as any}
          availableCount={availableCount}
          rentedCount={rentedCount}
        />
      </div>
    </div>
  );
}
