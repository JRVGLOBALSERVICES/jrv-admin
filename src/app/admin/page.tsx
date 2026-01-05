import { Suspense } from "react";
import Link from "next/link";
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

/* ===========================
   TYPES & HELPERS
   =========================== */
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

/**
 * FIXED CLASSIFICATION LOGIC
 * Corrects Search Partners by checking for syndicatedsearch.goog domain
 */
function classifyTrafficSource(referrer: string | null, url: string | null) {
  const ref = (referrer || "").toLowerCase();
  const u = (url || "").toLowerCase();

  // 1. Google Ads / Paid (Check URL for click IDs)
  if (
    u.includes("gclid") ||
    u.includes("gad_source") ||
    u.includes("utm_medium=cpc") ||
    u.includes("utm_medium=paid")
  ) {
    return "Google Ads";
  }

  // 2. Google Search Partners
  // Adjusted to catch syndicatedsearch.goog specifically
  if (
    u.includes("syndicate") ||
    u.includes("utm_medium=syndicate") ||
    ref.includes("syndicatedsearch.goog")
  ) {
    return "Google Search Partners";
  }

  // 3. Social Media
  if (ref.includes("facebook") || ref.includes("fb.com")) return "Facebook";
  if (ref.includes("instagram") || ref.includes("ig.me")) return "Instagram";
  if (ref.includes("tiktok")) return "TikTok";

  // 4. Google Organic
  if (ref.includes("google.com")) {
    return "Google Organic";
  }

  // 5. Everything else is Direct
  return "Direct";
}

function GlossyKpi({
  title,
  value,
  sub,
  color = "blue",
}: {
  title: string;
  value: string | number;
  sub: string;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const gradients = {
    blue: "from-cyan-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-400 to-green-600 shadow-green-200",
    purple: "from-violet-400 to-purple-600 shadow-purple-200",
    orange: "from-amber-400 to-orange-600 shadow-orange-200",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-linear-to-br ${gradients[color]} group hover:scale-[1.02] transition-transform duration-300`}
    >
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
          {title}
        </div>
        <div className="text-3xl font-black mt-2 tracking-tight drop-shadow-sm">
          {value}
        </div>
        <div className="text-xs font-medium mt-1 opacity-90 flex items-center gap-1">
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {sub}
          </span>
        </div>
      </div>
    </div>
  );
}

const RANK_BADGES = [
  "bg-indigo-500 text-white shadow-indigo-200",
  "bg-emerald-500 text-white shadow-emerald-200",
  "bg-amber-500 text-white shadow-amber-200",
  "bg-rose-500 text-white shadow-rose-200",
  "bg-sky-500 text-white shadow-sky-200",
  "bg-violet-500 text-white shadow-violet-200",
];

function rankBadge(i: number) {
  return RANK_BADGES[i % RANK_BADGES.length] + " shadow-md";
}

const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
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
  return Math.max(1, Math.ceil((b - a) / DAY_MS));
}

function startOfDayInKLToUTC(baseUtc: Date) {
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  const d = kl.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KL_OFFSET_MS);
}

function startOfBusinessDayInKLToUTC(baseUtc: Date, hour = 7) {
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  const d = kl.getUTCDate();
  let start = new Date(Date.UTC(y, m, d, hour, 0, 0, 0) - KL_OFFSET_MS);
  return start;
}

function endOfBusinessDayInKLToUTC(baseUtc: Date, hour = 7) {
  const start = startOfBusinessDayInKLToUTC(baseUtc, hour);
  return new Date(start.getTime() + DAY_MS - 1);
}

function parseKLMidnightToUTC(dateYYYYMMDD: string) {
  const [y, m, d] = dateYYYYMMDD.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - KL_OFFSET_MS);
  return isValidDate(dt) ? dt : null;
}

function parseKLEndOfDayToUTC(dateYYYYMMDD: string) {
  const s = parseKLMidnightToUTC(dateYYYYMMDD);
  if (!s) return null;
  return new Date(s.getTime() + DAY_MS - 1);
}

function getRange(
  period: Period,
  fromParam: string,
  toParam: string,
  now = new Date()
) {
  if (period === "custom" && fromParam && toParam) {
    const s = parseKLMidnightToUTC(fromParam);
    const e = parseKLEndOfDayToUTC(toParam);
    if (s && e) return { start: s, end: e };
  }

  if (period === "all") return { start: new Date(0), end: now };

  let start: Date;

  if (period === "daily") {
    start = startOfDayInKLToUTC(now);
  } else if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = startOfDayInKLToUTC(d);
  } else if (period === "monthly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = startOfDayInKLToUTC(d);
  } else if (period === "quarterly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    start = startOfDayInKLToUTC(d);
  } else if (period === "yearly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 365);
    start = startOfDayInKLToUTC(d);
  } else {
    start = startOfDayInKLToUTC(now);
  }

  return { start, end: now };
}

function isGarbageModel(name: string) {
  if (!name) return true;
  const n = name.toLowerCase().trim();

  if (
    n.includes("gad_source") ||
    n.includes("gclid") ||
    n.includes("campaignid") ||
    n.includes("fbclid") ||
    n.includes("http") ||
    n.includes("_wcB") ||
    n.includes("w8s")
  ) {
    return true;
  }
  if (n.length > 25) return true;
  if (n.includes("_")) return true;
  if (!n.includes(" ") && n.length > 15) return true;

  return false;
}

function normalizeModel(rawName: string | null) {
  if (!rawName) return "Unknown";
  if (isGarbageModel(rawName)) return "Unknown";

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

function getCatalogItem(rel: any) {
  if (Array.isArray(rel)) return rel[0] || {};
  return rel || {};
}

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

function cleanPart(v: any) {
  const s = String(v || "").trim();
  if (!s) return "";
  try {
    const decoded = decodeURIComponent(s.replace(/\+/g, " "));
    return decoded.trim();
  } catch {
    return s;
  }
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
   MAIN PAGE COMPONENT
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

  // 1. SITE ANALYTICS (Last 24h)
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeThreshold = new Date(now.getTime() - 5 * 60 * 1000);

  // FETCH events strictly last 24h
  const { data: siteEvents24h } = await supabase
    .from("site_events")
    .select(
      "created_at, event_name, session_id, anon_id, page_path, page_url, props, referrer, ip, country, region, city, isp"
    )
    .gte("created_at", last24h.toISOString())
    .order("created_at", { ascending: false })
    .limit(3000);

  const events = (siteEvents24h ?? []) as any[];

  // ---------------------------------------------------------
  // CRITICAL FIX: GROUP BY UNIQUE VISITOR IDENTITY
  // ---------------------------------------------------------
  const usersMap = new Map<
    string,
    {
      source: string;
      isp: string;
      location: string;
      models: Set<string>;
      isOnline: boolean;
      referrerHost: string;
    }
  >();

  let whatsappClicks24h = 0;
  let phoneClicks24h = 0;

  for (const e of events) {
    const userKey = e.session_id || e.anon_id || e.ip || "unknown";
    const createdAt = new Date(e.created_at).getTime();
    const en = String(e.event_name || "").toLowerCase();

    // Interaction stats remain hit-based
    if (en === "whatsapp_click") whatsappClicks24h++;
    if (en === "phone_click") phoneClicks24h++;

    // Grouping Logic
    if (!usersMap.has(userKey)) {
      let refHost = "Direct / None";
      if (e.referrer) {
        try {
          refHost = new URL(e.referrer).hostname.replace(/^www\./, "");
        } catch {
          refHost = "Other";
        }
      }

      usersMap.set(userKey, {
        source: classifyTrafficSource(e.referrer, e.page_url),
        isp: cleanPart(e.isp) || "Unknown",
        location: `${cleanPart(e.city) || "Unknown"}, ${
          cleanPart(e.region) || "Unknown"
        }`,
        models: new Set(),
        isOnline: false,
        referrerHost: refHost,
      });
    }

    const userData = usersMap.get(userKey)!;

    // Determine if currently active
    if (createdAt >= activeThreshold.getTime()) userData.isOnline = true;

    // Model interaction tracking (Unique per user)
    const props = safeJson(e.props);
    let rawModel = String(props?.model || "").trim();
    if (!rawModel && e.page_path && e.page_path.includes("/cars/")) {
      const inf = inferCarFromPath(e.page_path);
      if (inf && inf.model) rawModel = inf.model;
    }

    if (rawModel && !isGarbageModel(rawModel)) {
      const cleanName = normalizeModel(cleanPart(rawModel));
      if (cleanName !== "Unknown") userData.models.add(cleanName);
    }
  }

  // ---------------------------------------------------------
  // AGGREGATE STATS FROM GROUPED USERS
  // ---------------------------------------------------------
  const trafficCounts: any = {
    "Google Ads": 0,
    "Google Search Partners": 0,
    "Google Organic": 0,
    Facebook: 0,
    Instagram: 0,
    TikTok: 0,
    Direct: 0,
  };
  const modelCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const ispCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  let activeUsersRealtime = 0;

  usersMap.forEach((u) => {
    if (u.isOnline) activeUsersRealtime++;

    // Traffic Sources
    if (trafficCounts.hasOwnProperty(u.source)) trafficCounts[u.source]++;
    else trafficCounts["Direct"]++;

    // Referrer breakdown
    referrerCounts.set(
      u.referrerHost,
      (referrerCounts.get(u.referrerHost) || 0) + 1
    );

    // ISP
    if (u.isp !== "Unknown") {
      ispCounts.set(u.isp, (ispCounts.get(u.isp) || 0) + 1);
    }

    // Location
    locationCounts.set(u.location, (locationCounts.get(u.location) || 0) + 1);

    // Models viewed by this user
    u.models.forEach((m) => modelCounts.set(m, (modelCounts.get(m) || 0) + 1));
  });

  const miniSiteData = {
    activeUsersRealtime,
    uniqueSessions24h: usersMap.size, // <-- THIS WAS MISSING
    whatsappClicks: whatsappClicks24h,
    phoneClicks: phoneClicks24h,
    traffic: trafficCounts,
    topModels: Array.from(modelCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topReferrers: Array.from(referrerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topISP: Array.from(ispCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topLocations: Array.from(locationCounts.entries())
      .map(([name, users]) => ({ name, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10),
  };

  // 2. FINANCIAL DATA
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

  let query = supabase
    .from("agreements")
    .select(
      "id, customer_name, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
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

  let totalRevenue = 0;
  let totalDaysRented = 0;
  const byModel = new Map();
  const byPlate = new Map();
  const byBrand = new Map();

  for (const r of rows) {
    if (r.status === "Cancelled") continue;
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
    .map(([k, v]: any) => ({ key: k, ...v, adr: v.revenue / (v.days || 1) }))
    .sort((a: any, b: any) => b.revenue - a.revenue);
  const breakdownPlate = Array.from(byPlate.entries())
    .map(([k, v]: any) => ({ key: k, ...v }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);
  const breakdownBrand = Array.from(byBrand.entries())
    .map(([k, v]: any) => ({ key: k, ...v }))
    .sort((a: any, b: any) => b.revenue - a.revenue);

  const bookingCount = rows.filter((r) => r.status !== "Cancelled").length;
  const avgDailyRate = totalDaysRented > 0 ? totalRevenue / totalDaysRented : 0;
  const avgLength = bookingCount > 0 ? totalDaysRented / bookingCount : 0;
  const maxModelRev = breakdownModel[0]?.revenue || 1;

  // Cards data
  const todayStartUTC = startOfBusinessDayInKLToUTC(now, 7);
  const todayEndUTC = endOfBusinessDayInKLToUTC(now, 7);

  const { data: expiringToday } = await supabase
    .from("agreements")
    .select("*")
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
  const { data: activeNow } = await supabase
    .from("agreements")
    .select("*")
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .lte("date_start", todayStartUTC.toISOString())
    .gt("date_end", todayEndUTC.toISOString())
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
        const cat = getCatalogItem(c?.catalog_rel);
        return {
          id: c.id,
          plate_number: c.plate_number,
          location: c.location,
          car_label: [cat?.make, cat?.model].filter(Boolean).join(" ").trim(),
        };
      }) ?? [];
  const currentlyRentedRows =
    (activeNow ?? []).map((ag: any) => {
      const car = (carsBase ?? []).find((c: any) => c?.id === ag.car_id);
      const cat = getCatalogItem(car?.catalog_rel);
      return {
        agreement_id: ag.id,
        car_id: ag.car_id,
        plate_number: ag.plate_number || car?.plate_number || "—",
        car_label:
          ag.car_type ||
          [cat?.make, cat?.model].filter(Boolean).join(" ").trim() ||
          "—",
        customer_name: ag.customer_name ?? null,
        mobile: ag.mobile ?? null,
        date_end: ag.date_end ?? null,
        status: ag.status ?? null,
      };
    }) ?? [];

  const tomorrowStartUTC = new Date(todayStartUTC.getTime() + DAY_MS);
  const tomorrowEndUTC = new Date(tomorrowStartUTC.getTime() + DAY_MS - 1);
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
              : `Last ${diffDays(start.toISOString(), end.toISOString())} Days`}
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Financial Overview
          </h2>
          <p className="text-xs text-gray-500">
            Key performance indicators for {period}
          </p>
        </div>
        <Link
          href="/admin/revenue"
          className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
        >
          Full Report →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlossyKpi
          title="Revenue"
          value={fmtMoney(totalRevenue)}
          sub={`${bookingCount} bookings`}
          color="green"
        />
        <GlossyKpi
          title="Days Rented"
          value={totalDaysRented}
          sub="days total"
          color="blue"
        />
        <GlossyKpi
          title="Avg Daily Rate"
          value={fmtMoney(avgDailyRate)}
          sub="per day"
          color="purple"
        />
        <GlossyKpi
          title="Unique Visitors"
          value={usersMap.size}
          sub="last 24h"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Top Performing Cars</h3>
            <span className="text-xs bg-black text-white px-2 py-1 rounded">
              By Plate
            </span>
          </div>
          <div className="divide-y overflow-y-auto max-h-96">
            {breakdownPlate.map((p: any, i: number) => (
              <div
                key={p.key}
                className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
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
            {breakdownBrand.map((b: any) => (
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
                    <th className="px-4 py-3 whitespace-nowrap">Model</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      Performance
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      Trips
                    </th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">
                      ADR
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {breakdownModel.map((b: any) => {
                    const percent = (b.revenue / maxModelRev) * 100;
                    return (
                      <tr key={b.key} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {b.key}
                        </td>
                        <td className="px-4 py-3 w-1/4 align-middle">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-emerald-400 to-green-500 relative overflow-hidden"
                              style={{ width: `${percent}%` }}
                            >
                              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {fmtMoney(b.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                          {b.count}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 font-medium bg-gray-50/50 whitespace-nowrap">
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

      <MiniSiteAnalytics data={miniSiteData} />

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
