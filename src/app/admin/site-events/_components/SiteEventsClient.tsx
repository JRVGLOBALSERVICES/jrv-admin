"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Megaphone, MapPin, Globe } from "lucide-react";

type Filters = { event: string; traffic: string; device: string; path: string };

const DEFAULT_FILTERS: Filters = {
  event: "",
  traffic: "",
  device: "",
  path: "",
};

const PAGE_SIZE = 50;

// --- Helper: Format Path Names ---
function formatPageLabel(path: string | null) {
  if (!path) return "-";
  const p = path.toLowerCase();
  if (p === "/") return "Home";
  if (p === "/cars" || p === "/cars/") return "All Cars";
  if (p === "/branches" || p === "/branches/") return "Branches";
  if (p === "/about-us" || p === "/about-us/") return "About Us";
  if (p === "/contact" || p === "/contact/") return "Contact";
  if (p === "/faq" || p === "/faq/") return "FAQ";
  return path;
}

function Card({ title, children, headerExtras }: any) {
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

// Aggregation Helper
function aggregate(data: { name: string; count: number }[]) {
  const map = new Map<string, number>();
  for (const item of data) {
    const label = item.name;
    map.set(label, (map.get(label) || 0) + item.count);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* =========================
   UI COMPONENTS
   ========================= */

function GlossyKpi({ title, value, color = "blue" }: any) {
  const gradients: any = {
    blue: "from-cyan-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-400 to-green-600 shadow-green-200",
    purple: "from-violet-400 to-purple-600 shadow-purple-200",
    orange: "from-amber-400 to-orange-600 shadow-orange-200",
    pink: "from-rose-400 to-red-600 shadow-rose-200",
    indigo: "from-indigo-400 to-blue-800 shadow-indigo-200",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-linear-to-br ${
        gradients[color] || gradients.blue
      } group hover:scale-[1.02] transition-transform duration-300`}
    >
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">
            {title}
          </span>
        </div>
        <div className="text-4xl font-black mt-3 tracking-tight drop-shadow-sm">
          {value ? value.toLocaleString() : 0}
        </div>
      </div>
    </div>
  );
}

function MixRow({ label, value, total, color }: any) {
  const pct = Math.round((value / Math.max(1, total)) * 100);
  const gradients: any = {
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
  if (!series.length)
    return <div className="text-xs text-gray-400 italic">No data</div>;
  const w = 600;
  const h = 100;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(1, max - min);
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

function rankBadge(i: number) {
  const RANK_BADGES = [
    "bg-indigo-500 text-white shadow-indigo-200",
    "bg-emerald-500 text-white shadow-emerald-200",
    "bg-amber-500 text-white shadow-amber-200",
    "bg-rose-500 text-white shadow-rose-200",
    "bg-sky-500 text-white shadow-sky-200",
    "bg-violet-500 text-white shadow-violet-200",
  ];
  return RANK_BADGES[i % RANK_BADGES.length] + " shadow-md";
}

/* =========================
   MAIN CLIENT COMPONENT
   ========================= */

export default function SiteEventsClient({
  initialFrom,
  initialTo,
  initialRange,
  initialFilters,
}: any) {
  const [fromIso, setFromIso] = useState(initialFrom);
  const [toIso, setToIso] = useState(initialTo);
  const [filters, setFilters] = useState<Filters>(
    initialFilters || DEFAULT_FILTERS
  );

  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<any | null>(null);
  const [latestGps, setLatestGps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setFromIso(initialFrom);
    setToIso(initialTo);
    setFilters(initialFilters || DEFAULT_FILTERS);
    setCurrentPage(1);
  }, [initialFrom, initialTo, initialRange, initialFilters]);

  useEffect(() => {
    const ac = new AbortController();
    async function run() {
      setLoading(true);
      try {
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
            signal: ac.signal,
          }),
          fetch(`/api/admin/site-events/summary?${qs.toString()}`, {
            signal: ac.signal,
          }),
        ]);

        const aj = await a.json();
        const bj = await b.json();

        if (!ac.signal.aborted) {
          setRows(aj?.ok ? aj.rows || [] : []);
          setTotalCount(aj?.ok ? aj.total || 0 : 0);
          setSummary(bj?.ok ? bj : null);
          setLatestGps(bj?.latestGps || []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => ac.abort();
  }, [fromIso, toIso, filters, currentPage]);

  const s = summary;
  const trafficTotal =
    (s?.traffic.direct || 0) +
      (s?.traffic.organic || 0) +
      (s?.traffic.paid || 0) +
      (s?.traffic.referral || 0) || 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const mergedCountries = useMemo(() => {
    if (!s) return [];
    const all = [
      ...(s.topCountries?.organic || []),
      ...(s.topCountries?.paid || []),
      ...(s.topCountries?.direct || []),
      ...(s.topCountries?.referral || []),
    ];
    return aggregate(all).slice(0, 10);
  }, [s]);

  const mergedCities = useMemo(() => {
    if (!s) return [];
    return (s.topCities || []).slice(0, 15);
  }, [s]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlossyKpi
          title="Active Users"
          value={s?.activeUsersRealtime || 0}
          color="indigo"
        />
        <GlossyKpi title="Page Views" value={s?.pageViews || 0} color="blue" />
        <GlossyKpi
          title="WhatsApp"
          value={s?.whatsappClicks || 0}
          color="green"
        />
        <GlossyKpi title="Calls" value={s?.phoneClicks || 0} color="pink" />
        <GlossyKpi
          title="Organic"
          value={s?.traffic.organic || 0}
          color="green"
        />
        <GlossyKpi title="Paid" value={s?.traffic.paid || 0} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP MODELS */}
        <Card title="Top Models">
          <div className="p-4 space-y-2">
            {(s?.topModels || []).slice(0, 10).map((m: any, i: number) => (
              <Link
                key={m.key}
                href={`/admin/cars?model=${encodeURIComponent(m.key)}`}
                className="flex justify-between text-sm p-2 hover:bg-indigo-50 rounded group transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-700 group-hover:text-indigo-700">
                    {m.key}
                  </span>
                </div>
                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded text-xs">
                  {m.count}
                </span>
              </Link>
            ))}
            {!s?.topModels?.length && (
              <div className="text-gray-400 italic text-sm p-2">No data</div>
            )}
          </div>
        </Card>

        {/* ✅ PRECISE LOCATIONS CARD */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Precise Locations (GPS)"
            headerExtras={<MapPin className="w-4 h-4 text-indigo-500" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Exact Address</th>
                    <th className="px-4 py-2">ISP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {latestGps.map((g: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-indigo-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(g.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {g.exact_address}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {Number(g.lat).toFixed(5)}, {Number(g.lng).toFixed(5)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[160px]">
                        {g.isp || "—"}
                      </td>
                    </tr>
                  ))}
                  {latestGps.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-6 text-center text-gray-400 italic"
                      >
                        No exact GPS data captured in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TRAFFIC MIX */}
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

        {/* VOLUME CHART */}
        <div className="lg:col-span-2">
          <Card
            title="Traffic Volume"
            headerExtras={
              <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-1 rounded-full">
                Live
              </span>
            }
          >
            <div className="p-6">
              <Sparkline
                series={s?.trafficSeries?.map((x: any) => x.v) || []}
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP ISPs */}
        <Card
          title="Top ISPs / Networks"
          headerExtras={<Globe className="w-4 h-4 text-gray-400" />}
        >
          <div className="p-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {(s?.topIsps || []).slice(0, 10).map((item: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center p-2 rounded hover:bg-gray-50"
              >
                <span
                  className="text-xs font-medium text-gray-700 truncate max-w-[200px]"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">
                  {item.count}
                </span>
              </div>
            ))}
            {!s?.topIsps?.length && (
              <div className="text-gray-400 italic text-sm">No ISP data</div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-1">
          <Card title="Top Countries">
            <div className="p-4 space-y-2">
              {mergedCountries.map((x: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
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
                      {x.name}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900 text-xs">
                    {x.count}
                  </span>
                </div>
              ))}
              {!mergedCountries.length && (
                <div className="text-sm text-gray-400 p-2 italic">
                  No country data
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Top Cities">
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {mergedCities.map((x: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {x.name}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900 text-xs">
                    {x.count}
                  </span>
                </div>
              ))}
              {!mergedCities.length && (
                <div className="text-sm text-gray-400 p-2 italic">
                  No city data
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. MAIN EVENT LOG */}
      <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="font-bold text-gray-800 text-sm uppercase">
            Full Event Log
          </div>
          <div className="text-xs text-gray-500">{totalCount} Events</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Location & ISP</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r: any) => (
                <tr
                  key={r.id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap font-mono">
                    {new Date(r.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold border border-gray-200 group-hover:border-indigo-200 group-hover:bg-white group-hover:text-indigo-700">
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
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span
                        className="font-medium text-gray-700 truncate max-w-40"
                        title={r.locationLabel}
                      >
                        {r.locationLabel}
                      </span>
                      {r.isp && (
                        <span className="text-[9px] text-gray-400 truncate max-w-40">
                          {r.isp}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* ✅ FIXED: Details Column */}
                  <td className="px-4 py-2 text-gray-500 truncate max-w-xs">
                    {r.modelKey && r.modelKey !== "Unknown" && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 mr-1 font-bold">
                        {r.modelKey}
                      </span>
                    )}
                    {formatPageLabel(r.page_path)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages || 1, p + 1))
            }
            disabled={currentPage === totalPages || loading}
            className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
