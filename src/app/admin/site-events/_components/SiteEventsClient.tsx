"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Filters = { event: string; traffic: string; device: string; path: string };

// ✅ Safety Default
const DEFAULT_FILTERS: Filters = {
  event: "",
  traffic: "",
  device: "",
  path: "",
};

const PAGE_SIZE = 50;

type Summary = {
  ok: boolean;
  activeUsersRealtime: number;
  pageViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];
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
  topCountries: {
    paid: { name: string; count: number }[];
    organic: { name: string; count: number }[];
    direct: { name: string; count: number }[];
    referral: { name: string; count: number }[];
  };
  topCities: { name: string; count: number }[];
  compare?: any;
};

/* =========================
   Location normalization
   ========================= */

const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  MY: "Malaysia",
  SG: "Singapore",
  US: "United States",
  UK: "United Kingdom",
  GB: "United Kingdom",
  ID: "Indonesia",
  IN: "India",
  AU: "Australia",
  CA: "Canada",
  CN: "China",
  HK: "Hong Kong",
  JP: "Japan",
  KR: "South Korea",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  TW: "Taiwan",
};

function decodeSafe(v: any) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, "%20")).trim();
  } catch {
    return raw;
  }
}

function normalizeCountry(input: any) {
  const s = decodeSafe(input);
  if (!s) return "";
  const upper = s.toUpperCase();
  if (COUNTRY_CODE_TO_NAME[upper]) return COUNTRY_CODE_TO_NAME[upper];
  if (upper === "MALAYSIA") return "Malaysia";
  if (upper === "SINGAPORE") return "Singapore";
  if (upper === "UNITED STATES" || upper === "USA") return "United States";
  if (upper === "UNITED KINGDOM" || upper === "GREAT BRITAIN")
    return "United Kingdom";
  return s;
}

function cleanPart(v: any) {
  const s = decodeSafe(v);
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

function buildLocationLabel(cityRaw: any, regionRaw: any, countryRaw: any) {
  let city = cleanPart(cityRaw);
  let region = cleanPart(regionRaw);
  let country = normalizeCountry(countryRaw);

  if (city && city.includes(",")) {
    const parts = city
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const maybeCountry = normalizeCountry(parts[parts.length - 1]);
      const maybeRegion =
        parts.length >= 3 ? cleanPart(parts[parts.length - 2]) : "";
      if (!country && maybeCountry) country = maybeCountry;
      if (!region && maybeRegion && !/^\d+$/.test(maybeRegion))
        region = maybeRegion;
      city = cleanPart(parts[0] || city);
    }
  }

  const regionIsNumeric = region && /^\d+$/.test(region);
  let region2 = regionIsNumeric ? "" : region;
  if (city && region2 && city.toLowerCase() === region2.toLowerCase())
    region2 = "";
  return [city, region2, country].filter(Boolean).join(", ").trim();
}

function normalizePackedLocation(name: any) {
  const decoded = decodeSafe(name);
  if (!decoded) return "";
  const parts = decoded
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 2]))
    parts.splice(parts.length - 2, 1);
  if (parts.length === 2) {
    const maybeCountry = normalizeCountry(parts[1]);
    if (maybeCountry)
      return buildLocationLabel(parts[0] || "", "", maybeCountry) || decoded;
  }
  return (
    buildLocationLabel(parts[0] || "", parts[1] || "", parts[2] || "") ||
    decoded
  );
}

function fmtPct(p: number) {
  const v = Math.round(p * 100);
  if (!isFinite(v)) return "0%";
  return `${v > 0 ? "+" : ""}${v}%`;
}

/* =========================
   GLOSSY COMPONENTS
   ========================= */

function GlossyKpi({
  title,
  value,
  color = "blue",
  delta,
}: {
  title: string;
  value: number;
  color?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo";
  delta?: { delta: number; pct: number };
}) {
  const gradients = {
    blue: "from-cyan-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-400 to-green-600 shadow-green-200",
    purple: "from-violet-400 to-purple-600 shadow-purple-200",
    orange: "from-amber-400 to-orange-600 shadow-orange-200",
    pink: "from-rose-400 to-red-600 shadow-rose-200",
    indigo: "from-indigo-400 to-blue-800 shadow-indigo-200",
  };

  const selectedGradient = gradients[color] || gradients.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-linear-to-br ${selectedGradient} group hover:scale-[1.02] transition-transform duration-300`}
    >
      {/* Glass Shine */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">
            {title}
          </span>
          {delta && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 ${
                delta.delta >= 0 ? "text-white" : "text-white/80"
              }`}
            >
              {fmtPct(delta.pct)}
            </span>
          )}
        </div>
        <div className="text-4xl font-black mt-3 tracking-tight drop-shadow-sm">
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function MixRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "slate" | "emerald" | "amber" | "sky";
}) {
  const pct = Math.round((value / Math.max(1, total)) * 100);

  const gradients = {
    emerald: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    sky: "from-sky-400 to-blue-500",
    slate: "from-slate-400 to-slate-600",
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs text-gray-700 mb-1.5">
        <span className="font-bold text-gray-800 group-hover:text-black transition-colors">
          {label}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          <span className="font-bold text-gray-900">{value}</span> ({pct}%)
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100/80 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full bg-linear-to-r ${gradients[color]} shadow-sm transition-all duration-500 relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30" />
        </div>
      </div>
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const w = 600;
  const h = 100;

  if (!series.length)
    return <div className="text-xs text-gray-400 italic">No data</div>;

  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(1, max - min);

  // Smooth curve points
  const pts = series.map((v, i) => {
    const x = (i * w) / Math.max(1, series.length - 1);
    const y = h - ((v - min) * h) / range;
    return `${x},${y}`;
  });

  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `${pathD} L ${w},${h} L 0,${h} Z`;

  return (
    <div className="w-full h-30 relative overflow-hidden rounded-xl bg-linear-to-b from-indigo-50/50 to-white border border-indigo-100">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block absolute inset-0"
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkFill)" />
        <path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Card({
  title,
  children,
  headerExtras,
}: {
  title: string;
  children: any;
  headerExtras?: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden bg-white flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
        <div className="font-bold text-gray-800 text-sm uppercase tracking-wide">
          {title}
        </div>
        {headerExtras}
      </div>
      <div className="p-0 flex-1">{children}</div>
    </div>
  );
}

// ✅ VIBRANT TRAFFIC CHIPS
function typeChip(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid")
    return "bg-linear-to-r from-amber-100 to-orange-100 text-orange-800 border-orange-200";
  if (s === "organic")
    return "bg-linear-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200";
  if (s === "referral")
    return "bg-linear-to-r from-sky-100 to-blue-100 text-blue-800 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

// ✅ VIBRANT RANK BADGES
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

// ✅ Event Log Badges
function trafficPill(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid")
    return "bg-amber-100 text-amber-700 border-amber-200 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase";
  if (s === "organic")
    return "bg-emerald-100 text-emerald-700 border-emerald-200 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase";
  if (s === "referral")
    return "bg-sky-100 text-sky-700 border-sky-200 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase";
  return "bg-gray-100 text-gray-600 border-gray-200 border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase";
}

/* =========================
   MAIN CLIENT COMPONENT
   ========================= */

export default function SiteEventsClient({
  initialFrom,
  initialTo,
  initialRange,
  initialFilters,
}: {
  initialFrom: string;
  initialTo: string;
  initialRange: string;
  initialFilters: Filters;
}) {
  const [fromIso, setFromIso] = useState(initialFrom);
  const [toIso, setToIso] = useState(initialTo);
  const [rangeKey, setRangeKey] = useState(initialRange);

  // ✅ FIX: Ensure filters is never undefined
  const [filters, setFilters] = useState<Filters>(
    initialFilters || DEFAULT_FILTERS
  );

  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0); // ✅ Track total records for pagination
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqTick, setReqTick] = useState(0);

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setFromIso(initialFrom);
    setToIso(initialTo);
    setRangeKey(initialRange);
    setFilters(initialFilters || DEFAULT_FILTERS);
    setCurrentPage(1); // Reset page on filter change
  }, [initialFrom, initialTo, initialRange, initialFilters]);

  // debounce fetch
  useEffect(() => {
    const t = setTimeout(() => setReqTick((x) => x + 1), 150);
    return () => clearTimeout(t);
  }, [
    fromIso,
    toIso,
    rangeKey,
    filters?.event,
    filters?.traffic,
    filters?.device,
    filters?.path,
    currentPage, // ✅ Trigger fetch on page change
  ]);

  // main fetch
  useEffect(() => {
    const ac = new AbortController();
    async function run() {
      setLoading(true);
      try {
        // ✅ Server-Side Pagination: Pass page & limit to API
        const qs = new URLSearchParams({
          from: fromIso,
          to: toIso,
          page: currentPage.toString(),
          limit: PAGE_SIZE.toString(),
        });

        if (filters?.event) qs.set("event", filters.event);
        if (filters?.traffic) qs.set("traffic", filters.traffic);
        if (filters?.device) qs.set("device", filters.device);
        if (filters?.path) qs.set("path", filters.path);

        const [a, b] = await Promise.all([
          fetch(`/api/admin/site-events?${qs.toString()}`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch(`/api/admin/site-events/summary?${qs.toString()}`, {
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const aj = await a.json();
        const bj = await b.json();

        if (!ac.signal.aborted) {
          setRows(aj?.ok ? aj.rows || [] : []);
          setTotalCount(aj?.ok ? aj.total || 0 : 0); // ✅ Set total count from server
          setSummary(bj?.ok ? bj : null);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => ac.abort();
  }, [reqTick, fromIso, toIso, filters, currentPage]); // Added currentPage dependency

  // refresh summary loop
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ from: fromIso, to: toIso });
        if (filters?.event) qs.set("event", filters.event);
        if (filters?.traffic) qs.set("traffic", filters.traffic);
        if (filters?.device) qs.set("device", filters.device);
        if (filters?.path) qs.set("path", filters.path);

        const r = await fetch(
          `/api/admin/site-events/summary?${qs.toString()}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (j?.ok) setSummary(j);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [fromIso, toIso, filters]);

  const s = summary;
  const trafficTotal =
    (s?.traffic.direct || 0) +
      (s?.traffic.organic || 0) +
      (s?.traffic.paid || 0) +
      (s?.traffic.referral || 0) || 1;

  // Calculate pages
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Page Path counts (calculated from current page rows - might be less accurate but fast)
  // Ideally this should come from the Summary API if we want global stats
  const pagePathCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (String(r.event_name).toLowerCase() !== "page_view") continue;
      const key = r.page_path || "(unknown)";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlossyKpi
          title="Active (5m)"
          value={s?.activeUsersRealtime || 0}
          color="indigo"
          delta={undefined}
        />
        <GlossyKpi
          title="Page Views"
          value={s?.pageViews || 0}
          color="blue"
          delta={s?.compare?.pageViews}
        />
        <GlossyKpi
          title="WhatsApp"
          value={s?.whatsappClicks || 0}
          color="green"
          delta={s?.compare?.whatsappClicks}
        />
        <GlossyKpi
          title="Calls"
          value={s?.phoneClicks || 0}
          color="pink"
          delta={s?.compare?.phoneClicks}
        />
        <GlossyKpi
          title="Organic"
          value={s?.traffic.organic || 0}
          color="green"
          delta={s?.compare?.traffic?.organic}
        />
        <GlossyKpi
          title="Paid"
          value={s?.traffic.paid || 0}
          color="orange"
          delta={s?.compare?.traffic?.paid}
        />
      </div>

      {/* 2. Traffic Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Mix */}
        <div className="lg:col-span-1">
          <Card title="Traffic Mix">
            <div className="p-5 space-y-5">
              <MixRow
                label="Paid Search"
                value={s?.traffic.paid || 0}
                total={trafficTotal}
                color="amber"
              />
              <MixRow
                label="Organic Search"
                value={s?.traffic.organic || 0}
                total={trafficTotal}
                color="emerald"
              />
              <MixRow
                label="Referral"
                value={s?.traffic.referral || 0}
                total={trafficTotal}
                color="sky"
              />
              <MixRow
                label="Direct"
                value={s?.traffic.direct || 0}
                total={trafficTotal}
                color="slate"
              />
            </div>
          </Card>
        </div>

        {/* Traffic Chart */}
        <div className="lg:col-span-2">
          <Card
            title="Traffic Volume (Trend)"
            headerExtras={
              <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-1 rounded-full">
                Live Updates
              </span>
            }
          >
            <div className="p-6">
              <Sparkline series={s?.trafficSeries?.map((x) => x.v) || []} />
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <div className="text-xs text-gray-500 uppercase font-bold">
                    Total Events
                  </div>
                  <div className="text-lg font-black text-gray-800">
                    {totalCount}
                  </div>{" "}
                  {/* ✅ Show total count from DB */}
                </div>
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <div className="text-xs text-gray-500 uppercase font-bold">
                    Peak Vol
                  </div>
                  <div className="text-lg font-black text-gray-800">
                    {Math.max(...(s?.trafficSeries?.map((x) => x.v) || [0]))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Top Models, Referrers, Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ✅ TOP MODELS with LINK */}
        <Card title="Top Models">
          <div className="p-4 space-y-2">
            {(s?.topModels || []).slice(0, 10).map((m, i) => (
              <Link
                key={m.key}
                href={`/admin/cars?model=${encodeURIComponent(m.key)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 group border border-transparent hover:border-indigo-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700">
                    {m.key}
                  </span>
                </div>
                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded text-xs border border-gray-100 group-hover:bg-white">
                  {m.count}
                </span>
              </Link>
            ))}
            {!s?.topModels?.length && (
              <div className="text-sm text-gray-400 p-2 italic">
                No model data
              </div>
            )}
          </div>
        </Card>

        {/* Top Countries */}
        <Card title="Top Countries">
          <div className="p-4 space-y-2">
            {(s?.topCountries?.organic || [])
              .concat(s?.topCountries?.paid || [])
              .slice(0, 10)
              .map((x, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {normalizeCountry(x.name)}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">{x.count}</span>
                </div>
              ))}
            {!(s?.topCountries?.organic || []).length && (
              <div className="text-sm text-gray-400 p-2 italic">
                No country data
              </div>
            )}
          </div>
        </Card>

        {/* Top Cities */}
        <Card title="Top Cities">
          <div className="p-4 space-y-2 max-h-100 overflow-y-auto custom-scrollbar">
            {(s?.topCities || []).slice(0, 15).map((x, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {normalizePackedLocation(x.name)}
                  </span>
                </div>
                <span className="font-bold text-gray-900">{x.count}</span>
              </div>
            ))}
            {!s?.topCities?.length && (
              <div className="text-sm text-gray-400 p-2 italic">
                No city data
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Event Log (Server-Side Paginated) */}
      <div className="rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-800 text-sm uppercase tracking-wide">
              Event Log
            </div>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
              {totalCount} Total
            </span>
          </div>
          {loading && (
            <span className="text-xs animate-pulse text-indigo-500 font-bold">
              SYNCING...
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap font-mono text-[10px]">
                    {new Date(r.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold border border-gray-200 group-hover:border-indigo-200 group-hover:bg-white group-hover:text-indigo-700 transition-all">
                      {r.event_name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className={trafficPill(r.trafficFixed)}>
                        {r.trafficFixed}
                      </span>
                      <span
                        className="text-[10px] text-gray-400 truncate max-w-24 mt-0.5"
                        title={r.referrer}
                      >
                        {r.refName}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-2 text-gray-600 truncate max-w-32"
                    title={buildLocationLabel(r.city, r.region, r.country)}
                  >
                    {buildLocationLabel(r.city, r.region, r.country) || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {r.modelKey && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 mr-1 font-bold">
                        {r.modelKey}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 truncate max-w-32 inline-block align-bottom">
                      {r.page_path}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-gray-400 italic"
                  >
                    No recent events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ GLOSSY PAGINATION FOOTER */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex justify-between items-center backdrop-blur-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-4 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-gray-500">
            Page{" "}
            <span className="font-bold text-indigo-700">{currentPage}</span> of{" "}
            <span className="font-bold text-gray-900">{totalPages || 1}</span>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
