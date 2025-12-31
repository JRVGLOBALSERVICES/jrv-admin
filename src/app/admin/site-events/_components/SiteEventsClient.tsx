"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteEventRow } from "@/lib/site-events";

type Filters = { event: string; traffic: string; device: string; path: string };

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
    // also handle "+" as spaces
    return decodeURIComponent(raw.replace(/\+/g, "%20")).trim();
  } catch {
    return raw;
  }
}

function normalizeCountry(input: any) {
  const s = decodeSafe(input);
  if (!s) return "";

  // if user saved full name already, keep it
  const upper = s.toUpperCase();

  // "MY" -> Malaysia
  if (COUNTRY_CODE_TO_NAME[upper]) return COUNTRY_CODE_TO_NAME[upper];

  // If value is already "Malaysia" etc, keep it
  // (you can add more aliases if needed)
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

  // kill things like "Kuala Lumpur, 14, MY" middle numeric region codes
  // (your earlier example had 14)
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Build a pretty label from either:
 * - separate fields (city/region/country), OR
 * - a packed string "Kuala%20Lumpur, 14, MY"
 */
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
      const maybeRegion = parts.length >= 3 ? cleanPart(parts[parts.length - 2]) : "";

      if (!country && maybeCountry) country = maybeCountry;
      if (!region && maybeRegion && !/^\d+$/.test(maybeRegion)) region = maybeRegion;

      city = cleanPart(parts[0] || city);
    }
  }

  // remove numeric-only region segments (like "14")
  const regionIsNumeric = region && /^\d+$/.test(region);

  const city2 = city;
  let region2 = regionIsNumeric ? "" : region;
  const country2 = country;

  // prevent duplication: "Kuala Lumpur, Kuala Lumpur, MY"
  if (city2 && region2 && city2.toLowerCase() === region2.toLowerCase()) {
    region2 = "";
  }

  const parts = [city2, region2, country2].filter(Boolean);

  // If you only have "MY" in city etc, avoid weird output
  const out = parts.join(", ").trim();
  return out;
}

/**
 * When x.name is already a combined string like:
 * "Santa%20Clara, CA, US" OR "Kuala%20Lumpur, 14, MY"
 */
function normalizePackedLocation(name: any) {
  const decoded = decodeSafe(name);
  if (!decoded) return "";

  const parts = decoded
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  // remove numeric middle parts e.g. [Kuala Lumpur, 14, MY]
  if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 2])) {
    parts.splice(parts.length - 2, 1);
  }

  if (parts.length === 2) {
    const maybeCountry = normalizeCountry(parts[1]);
    if (maybeCountry) return buildLocationLabel(parts[0] || "", "", maybeCountry) || decoded;
  }

  const city = parts[0] || "";
  const region = parts[1] || "";
  const country = parts[2] || "";

  return buildLocationLabel(city, region, country) || decoded;
}

/* =========================
   UI helpers
   ========================= */

function fmtPct(p: number) {
  const v = Math.round(p * 100);
  if (!isFinite(v)) return "0%";
  return `${v}%`;
}

function deltaTone(v: number) {
  if (v > 0) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (v < 0) return "text-rose-700 bg-rose-50 border-rose-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function DeltaPill({ cmp }: { cmp?: { delta: number; pct: number } }) {
  const d = cmp?.delta ?? 0;
  const p = cmp?.pct ?? 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full border ${deltaTone(
        d
      )}`}
    >
      <span>
        {d > 0 ? "+" : ""}
        {d}
      </span>
      <span className="opacity-70">({fmtPct(p)})</span>
    </span>
  );
}

function Kpi({
  title,
  value,
  tone,
  delta,
}: {
  title: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "sky" | "indigo";
  delta?: { delta: number; pct: number };
}) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };

  return (
    <div className={`rounded-2xl border p-3 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-black uppercase opacity-80">
          {title}
        </div>
        <DeltaPill cmp={delta} />
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
      {label}
    </span>
  );
}

function MixRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "slate" | "emerald" | "amber" | "sky";
}) {
  const pct = Math.round((value / Math.max(1, total)) * 100);
  const barClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
      ? "bg-amber-500"
      : tone === "sky"
      ? "bg-sky-500"
      : "bg-slate-500";

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
        <span className="font-semibold">{label}</span>
        <span className="font-black">
          {value} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bar({
  label,
  pct,
  tone,
  value,
}: {
  label: string;
  pct: number;
  tone: "indigo" | "emerald" | "rose";
  value: number;
}) {
  const c =
    tone === "indigo"
      ? "bg-indigo-500"
      : tone === "emerald"
      ? "bg-emerald-500"
      : "bg-rose-500";

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
        <span className="font-semibold">{label}</span>
        <span className="font-black text-gray-800">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-2 ${c}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const w = 520;
  const h = 90;
  const pad = 6;

  if (!series.length) return null;

  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(1, max - min);

  const pts = series.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
    const y = pad + ((max - v) * (h - pad * 2)) / range;
    return `${x},${y}`;
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} className="block text-indigo-600">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={pts.join(" ")}
        />
        <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="#e5e7eb" />
      </svg>
      <div className="text-[11px] text-gray-500 mt-1">Updated every 5s</div>
    </div>
  );
}

function rowBorder(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid") return "border-l-4 border-amber-400";
  if (s === "organic") return "border-l-4 border-emerald-400";
  if (s === "referral") return "border-l-4 border-sky-400";
  return "border-l-4 border-gray-200";
}

function trafficPill(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid")
    return "px-2 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200";
  if (s === "organic")
    return "px-2 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (s === "referral")
    return "px-2 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-800 border border-sky-200";
  return "px-2 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-800 border border-gray-200";
}

// fixed palette so Tailwind keeps the classes
const RANK_BADGES = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-violet-50 text-violet-700 border-violet-200",
];

function rankBadge(i: number) {
  return RANK_BADGES[i % RANK_BADGES.length];
}

function typeChip(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "organic")
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s === "referral") return "bg-sky-50 text-sky-800 border-sky-200";
  return "bg-slate-50 text-slate-800 border-slate-200";
}

function Card({
  title,
  headerClass,
  children,
}: {
  title: string;
  headerClass?: string;
  children: any;
}) {
  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
      <div
        className={`p-4 border-b font-semibold text-gray-900 ${
          headerClass || "bg-gray-50"
        }`}
      >
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

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
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqTick, setReqTick] = useState(0);

  useEffect(() => {
    setFromIso(initialFrom);
    setToIso(initialTo);
    setRangeKey(initialRange);
    setFilters(initialFilters);
  }, [initialFrom, initialTo, initialRange, initialFilters]);

  // debounce fetch a bit
  useEffect(() => {
    const t = setTimeout(() => setReqTick((x) => x + 1), 150);
    return () => clearTimeout(t);
  }, [
    fromIso,
    toIso,
    rangeKey,
    filters.event,
    filters.traffic,
    filters.device,
    filters.path,
  ]);

  // main fetch (rows + summary)
  useEffect(() => {
    const ac = new AbortController();

    async function run() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          from: fromIso,
          to: toIso,
          limit: "1200",
        });
        if (filters.event) qs.set("event", filters.event);
        if (filters.traffic) qs.set("traffic", filters.traffic);
        if (filters.device) qs.set("device", filters.device);
        if (filters.path) qs.set("path", filters.path);

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
          setSummary(bj?.ok ? bj : null);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    run();
    return () => ac.abort();
  }, [reqTick]);

  // refresh only summary every 5s (light)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ from: fromIso, to: toIso });
        if (filters.event) qs.set("event", filters.event);
        if (filters.traffic) qs.set("traffic", filters.traffic);
        if (filters.device) qs.set("device", filters.device);
        if (filters.path) qs.set("path", filters.path);

        const r = await fetch(
          `/api/admin/site-events/summary?${qs.toString()}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (j?.ok) setSummary(j);
      } catch {}
    }, 5000);

    return () => clearInterval(t);
  }, [
    fromIso,
    toIso,
    filters.event,
    filters.traffic,
    filters.device,
    filters.path,
  ]);

  const s = summary;

  const trafficTotal =
    (s?.traffic.direct || 0) +
      (s?.traffic.organic || 0) +
      (s?.traffic.paid || 0) +
      (s?.traffic.referral || 0) || 1;

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
      .slice(0, 20);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-linear-to-r from-indigo-50 via-sky-50 to-emerald-50 flex flex-col gap-2">
          <div className="text-lg font-black text-gray-900">
            Site Events • GA Style
          </div>
          <div className="text-xs text-gray-600">
            Session-based attribution: first event decides acquisition. Geo
            derived from IP (runtime) + uses saved country/region/city when
            available.
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi
            title="Realtime Active (5m)"
            value={s?.activeUsersRealtime || 0}
            tone="indigo"
            delta={undefined}
          />
          <Kpi
            title="Page Views"
            value={s?.pageViews || 0}
            tone="sky"
            delta={s?.compare?.pageViews}
          />
          <Kpi
            title="WhatsApp"
            value={s?.whatsappClicks || 0}
            tone="emerald"
            delta={s?.compare?.whatsappClicks}
          />
          <Kpi
            title="Calls"
            value={s?.phoneClicks || 0}
            tone="rose"
            delta={s?.compare?.phoneClicks}
          />
          <Kpi
            title="Organic"
            value={s?.traffic.organic || 0}
            tone="emerald"
            delta={s?.compare?.traffic?.organic}
          />
          <Kpi
            title="Paid"
            value={s?.traffic.paid || 0}
            tone="amber"
            delta={s?.compare?.traffic?.paid}
          />
        </div>

        <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Traffic Mix
            </div>

            <div className="space-y-2">
              <MixRow
                label="Direct"
                value={s?.traffic.direct || 0}
                total={trafficTotal}
                tone="slate"
              />
              <MixRow
                label="Organic"
                value={s?.traffic.organic || 0}
                total={trafficTotal}
                tone="emerald"
              />
              <MixRow
                label="Paid"
                value={s?.traffic.paid || 0}
                total={trafficTotal}
                tone="amber"
              />
              <MixRow
                label="Referral"
                value={s?.traffic.referral || 0}
                total={trafficTotal}
                tone="sky"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label={`Direct ${s?.traffic.direct || 0}`} />
              <Pill label={`Organic ${s?.traffic.organic || 0}`} />
              <Pill label={`Paid ${s?.traffic.paid || 0}`} />
              <Pill label={`Referral ${s?.traffic.referral || 0}`} />
            </div>
          </div>

          <div className="rounded-xl border p-3 bg-white lg:col-span-2">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Traffic Over Time
            </div>
            {s?.trafficSeries?.length ? (
              <Sparkline series={s.trafficSeries.map((x) => x.v)} />
            ) : (
              <div className="text-sm text-gray-400">No chart data yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Top Countries (by Traffic Type)"
          headerClass="bg-gradient-to-r from-slate-50 via-indigo-50 to-emerald-50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["paid", "organic", "direct", "referral"] as const).map((k) => (
              <div key={k} className="rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-black uppercase text-gray-700">
                    {k}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${typeChip(
                      k
                    )}`}
                  >
                    {k}
                  </span>
                </div>

                <div className="space-y-2">
                  {(s?.topCountries?.[k] || []).slice(0, 6).map((x, idx) => (
                    <div
                      key={`${k}-${x.name}-${idx}`}
                      className="flex items-center justify-between text-sm border rounded-xl p-2 bg-white"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black ${rankBadge(
                            idx
                          )}`}
                        >
                          {idx + 1}
                        </span>

                        <div className="font-semibold text-gray-900 truncate max-w-56">
                          {normalizeCountry(x.name) || x.name}
                        </div>
                      </div>
                      <div className="font-black text-gray-900">{x.count}</div>
                    </div>
                  ))}

                  {!(s?.topCountries?.[k] || []).length && (
                    <div className="text-sm text-gray-400">No data</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Top Cities / Regions"
          headerClass="bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50"
        >
          <div className="space-y-2">
            {(s?.topCities || []).slice(0, 15).map((x, i) => (
              <div
                key={`${x.name}-${i}`}
                className="flex items-center justify-between text-sm border rounded-xl p-3 bg-white"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>

                  <div className="font-semibold text-gray-900 truncate max-w-90">
                    {normalizePackedLocation(x.name) || "Unknown"}
                  </div>
                </div>
                <div className="font-black text-gray-900">{x.count}</div>
              </div>
            ))}
            {!s?.topCities?.length && (
              <div className="text-sm text-gray-400">No location data yet</div>
            )}
          </div>
        </Card>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between bg-linear-to-r from-slate-50 via-indigo-50 to-emerald-50">
          <div>
            <div className="font-semibold text-gray-900">
              Page Views by Page Path
            </div>
            <div className="text-xs text-gray-500">
              Counts only page_view events
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading…" : `${rows.length} rows`}
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {pagePathCounts.map((p) => (
            <div
              key={p.path}
              className="border rounded-xl p-3 bg-white flex items-center justify-between"
            >
              <div className="text-sm font-semibold text-gray-900">
                {p.path}
              </div>
              <div className="text-sm font-black text-gray-900">{p.count}</div>
            </div>
          ))}
          {!pagePathCounts.length && (
            <div className="text-sm text-gray-400">No page views yet</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between bg-linear-to-r from-slate-50 via-indigo-50 to-emerald-50">
          <div>
            <div className="font-semibold text-gray-900">
              All Events (Filtered)
            </div>
            <div className="text-xs text-gray-500">
              Everything here matches your filters
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading…" : `${rows.length} rows`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Path</th>
                <th className="px-4 py-3 text-left">Traffic</th>
                <th className="px-4 py-3 text-left">Referrer</th>
                <th className="px-4 py-3 text-left">Campaign</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Props</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r: any) => (
                <tr
                  key={r.id}
                  className={rowBorder(r.trafficFixed) + " hover:bg-gray-50"}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold border bg-white">
                      {r.event_name}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    {r.page_path || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span className={trafficPill(r.trafficFixed)}>
                      {r.trafficFixed}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {r.refName}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate max-w-60">
                      {r.referrer || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold">
                      {r.campaignKey}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {r.modelKey}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-700">
                    {buildLocationLabel(r.city, r.region, r.country) ||
                      "Unknown"}
                  </td>

                  <td className="px-4 py-3">
                    <pre className="text-[11px] bg-gray-50 border rounded-xl p-2 max-w-130 overflow-auto">
                      {JSON.stringify(r.propsObj || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No events in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
