"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteEventRow } from "@/lib/site-events";
import {
  inferTrafficTypeEnhanced,
  parseUrlParams,
  referrerName,
  safeParseProps,
  getModelKey,
} from "@/lib/site-events";

type Summary = {
  activeUsersRealtime: number;
  pageViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];
  trafficSeries: { t: string; v: number }[];
  funnel: { model: string; views: number; whatsapp: number; rate: number }[];
};

function clampDateValue(iso: string) {
  // input[type=date] needs yyyy-mm-dd
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export default function SiteEventsClient({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();

  const [fromIso, setFromIso] = useState(initialFrom);
  const [toIso, setToIso] = useState(initialTo);

  const [rows, setRows] = useState<SiteEventRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fromDate = useMemo(() => clampDateValue(fromIso), [fromIso]);
  const toDate = useMemo(() => clampDateValue(toIso), [toIso]);

  async function loadAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from: fromIso,
        to: toIso,
        limit: "500",
      });

      const [a, b] = await Promise.all([
        fetch(`/api/admin/site-events?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/site-events/summary?${qs.toString()}`, { cache: "no-store" }),
      ]);

      const aj = await a.json();
      const bj = await b.json();

      setRows(aj?.rows || []);
      setSummary(bj?.ok ? bj : null);
    } finally {
      setLoading(false);
    }
  }

  // initial load + reload on range change
  useEffect(() => {
    loadAll();
    // reflect in URL for shareable ranges
    const sp = new URLSearchParams({ from: fromIso, to: toIso });
    router.replace(`/admin/site-events?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIso, toIso]);

  // realtime refresh for active users + charts
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ from: fromIso, to: toIso });
        const r = await fetch(`/api/admin/site-events/summary?${qs.toString()}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) setSummary(j);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [fromIso, toIso]);

  const computed = useMemo(() => {
    // table enhancements
    return rows.map((r) => {
      const props = safeParseProps(r.props);
      const traffic = inferTrafficTypeEnhanced(r);
      const refName = referrerName(r.referrer);
      const urlParams = parseUrlParams(r.page_url);

      const modelKey = getModelKey(r);

      const isAds = !!(urlParams.gclid || urlParams.gbraid || urlParams.wbraid || urlParams.gad_campaignid);
      const adsLabel = isAds
        ? `Google Ads • camp:${urlParams.gad_campaignid || "-"} • gclid:${urlParams.gclid ? "yes" : "no"}`
        : "";

      return { ...r, propsObj: props, trafficFixed: traffic, refName, modelKey, adsLabel };
    });
  }, [rows]);

  const pagePathCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of computed) {
      if (String(r.event_name).toLowerCase() !== "page_view") continue;
      const key = r.page_path || "(unknown)";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [computed]);

  const topModelsLocal = useMemo(() => {
    // fallback if summary not loaded
    const m = new Map<string, number>();
    for (const r of computed) {
      const en = String(r.event_name || "").toLowerCase();
      const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);

      const countIt =
        en === "model_click" ||
        (isCarDetail && (en === "page_view" || en === "site_load" || en === "whatsapp_click" || en === "phone_click"));

      if (!countIt) continue;
      const key = r.modelKey || "Unknown";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [computed]);

  const topReferrersLocal = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of computed) {
      m.set(r.refName, (m.get(r.refName) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [computed]);

  const trafficFixedCounts = useMemo(() => {
    const base = { direct: 0, organic: 0, paid: 0, referral: 0 };
    for (const r of computed) {
      const t = r.trafficFixed as keyof typeof base;
      base[t] = (base[t] || 0) + 1;
    }
    return base;
  }, [computed]);

  const s = summary || {
    activeUsersRealtime: 0,
    pageViews: pagePathCounts.reduce((a, b) => a + b.count, 0),
    whatsappClicks: computed.filter((x) => String(x.event_name).toLowerCase() === "whatsapp_click").length,
    phoneClicks: computed.filter((x) => String(x.event_name).toLowerCase() === "phone_click").length,
    traffic: trafficFixedCounts,
    topModels: topModelsLocal,
    topReferrers: topReferrersLocal,
    trafficSeries: [],
    funnel: [],
  };

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-black text-gray-900">Site Events • GA Style</div>
            <div className="text-xs text-gray-500">
              Shows full data from DB, enhanced traffic classification (Google Ads gclid/gbraid)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-gray-500">Date range</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setFromIso(startOfDayIso(d));
              }}
              className="text-xs border rounded px-2 py-2 bg-white"
            />
            <span className="text-xs text-gray-400">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setToIso(endOfDayIso(d));
              }}
              className="text-xs border rounded px-2 py-2 bg-white"
            />

            <button
              onClick={() => loadAll()}
              className="text-xs font-semibold px-3 py-2 rounded border bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi title="Realtime Active (5m)" value={s.activeUsersRealtime} tone="indigo" />
          <Kpi title="Page Views" value={s.pageViews} tone="sky" />
          <Kpi title="WhatsApp" value={s.whatsappClicks} tone="emerald" />
          <Kpi title="Calls" value={s.phoneClicks} tone="rose" />
          <Kpi title="Organic" value={s.traffic.organic} tone="emerald" />
          <Kpi title="Paid" value={s.traffic.paid} tone="amber" />
        </div>

        {/* mini charts + traffic mix */}
        <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs font-semibold text-gray-600 mb-2">Traffic Mix</div>
            <div className="flex flex-wrap gap-2">
              <Pill label={`Direct ${s.traffic.direct}`} />
              <Pill label={`Organic ${s.traffic.organic}`} />
              <Pill label={`Paid ${s.traffic.paid}`} />
              <Pill label={`Referral ${s.traffic.referral}`} />
            </div>
            <div className="text-[11px] text-gray-500 mt-2">
              ✅ Paid is detected via gclid/gbraid/gad_campaignid in page_url
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-white lg:col-span-2">
            <div className="text-xs font-semibold text-gray-600 mb-2">📈 Traffic Over Time</div>
            {s.trafficSeries?.length ? (
              <Sparkline series={s.trafficSeries.map((x) => x.v)} />
            ) : (
              <div className="text-sm text-gray-400">No chart data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Funnel + Top Models + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="🧠 Funnel: View → WhatsApp (Top Models)">
          {s.funnel?.length ? (
            <div className="space-y-2">
              {s.funnel.map((f) => (
                <div key={f.model} className="p-3 border rounded-lg bg-white flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{f.model}</div>
                    <div className="text-xs text-gray-500">
                      Views {f.views} → WhatsApp {f.whatsapp}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-700">{Math.round(f.rate * 100)}%</div>
                    <div className="text-[11px] text-gray-500">conversion</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">No funnel data yet</div>
          )}
        </Card>

        <Card title="🚗 Top Models (Views + WhatsApp + Calls + Model Clicks)">
          <div className="space-y-2">
            {(s.topModels?.length ? s.topModels : topModelsLocal).slice(0, 15).map((m, i) => (
              <div key={m.key} className="flex items-center justify-between text-sm border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900">{m.key}</span>
                </div>
                <span className="font-black text-gray-900">{m.count}</span>
              </div>
            ))}
            {!((s.topModels?.length ? s.topModels : topModelsLocal).length) && (
              <div className="text-sm text-gray-400">No model activity yet</div>
            )}
          </div>
        </Card>

        <Card title="🔗 Top Referrers (names)">
          <div className="space-y-2">
            {(s.topReferrers?.length ? s.topReferrers : topReferrersLocal).slice(0, 15).map((r, i) => (
              <div key={r.name} className="flex items-center justify-between text-sm border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900">{r.name}</span>
                </div>
                <span className="font-black text-gray-900">{r.count}</span>
              </div>
            ))}
            {!((s.topReferrers?.length ? s.topReferrers : topReferrersLocal).length) && (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Page path count */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="font-semibold text-gray-900">Page Views by Page Path</div>
          <div className="text-xs text-gray-500">Counts only page_view events</div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {pagePathCounts.map((p) => (
            <div key={p.path} className="border rounded-lg p-3 bg-white flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">{p.path}</div>
              <div className="text-sm font-black text-gray-900">{p.count}</div>
            </div>
          ))}
          {!pagePathCounts.length && <div className="text-sm text-gray-400">No page views yet</div>}
        </div>
      </div>

      {/* Full events table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">All Events (Full Data)</div>
            <div className="text-xs text-gray-500">
              Includes props + Google Ads meta extracted from page_url
            </div>
          </div>
          <div className="text-xs text-gray-500">{loading ? "Loading…" : `${computed.length} rows`}</div>
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
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Google/Ads Meta</th>
                <th className="px-4 py-3 text-left">Props</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {computed.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold border bg-white">
                      {r.event_name}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-800">{r.page_path || "—"}</td>

                  <td className="px-4 py-3">
                    <span className={trafficPill(r.trafficFixed)}>{r.trafficFixed}</span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.refName}</div>
                    <div className="text-[11px] text-gray-500 truncate max-w-[220px]">
                      {r.referrer || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.modelKey}</div>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-700">
                    {r.adsLabel ? (
                      <span className="px-2 py-1 rounded border bg-amber-50 border-amber-200 text-amber-800 font-semibold">
                        {r.adsLabel}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <pre className="text-[11px] bg-gray-50 border rounded p-2 max-w-[520px] overflow-auto">
                      {JSON.stringify(r.propsObj || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}

              {!computed.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
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

function trafficPill(t: string) {
  const s = String(t || "").toLowerCase();
  if (s === "paid") return "px-2 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200";
  if (s === "organic") return "px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (s === "referral") return "px-2 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200";
  return "px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200";
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 font-semibold text-gray-900">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">{label}</span>;
}

function Kpi({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "sky" | "indigo";
}) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <div className="text-[11px] font-semibold uppercase opacity-80">{title}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
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
      <svg width={w} height={h} className="block">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts.join(" ")} />
        <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="#e5e7eb" />
      </svg>
      <div className="text-[11px] text-gray-500 mt-1">
        Updated every 5s • shows event volume trend
      </div>
    </div>
  );
}
