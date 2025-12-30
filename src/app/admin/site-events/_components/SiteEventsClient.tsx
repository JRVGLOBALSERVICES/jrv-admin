"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SiteEventRow } from "./types";

type Bucket = { label: string; direct: number; organic: number; paid: number; referral: number; total: number };
type TopItem = { key: string; count: number };

function safeParseProps(p: any) {
  if (!p) return {};
  if (typeof p === "object") return p;
  if (typeof p === "string") {
    try {
      return JSON.parse(p);
    } catch {
      return {};
    }
  }
  return {};
}

function isCarDetailPath(p?: string | null) {
  if (!p) return false;
  if (!p.startsWith("/cars/")) return false;
  return p !== "/cars" && p !== "/cars/";
}

function slugFromCarPath(p: string) {
  return p.replace(/^\/cars\//, "").replace(/\/$/, "");
}

function humanizeSlug(slug: string) {
  return slug.split("-").filter(Boolean).join(" ").trim();
}

function extractModelKey(row: SiteEventRow): string | null {
  const props = safeParseProps(row.props);

  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();
  if (make && model) return `${make} ${model}`.trim();
  if (model) return model;

  const slug = String(props?.slug || "").trim();
  if (slug) return humanizeSlug(slug);

  if (isCarDetailPath(row.page_path)) {
    const s = slugFromCarPath(row.page_path!);
    if (s) return humanizeSlug(s);
  }
  return null;
}

function refDomain(ref?: string | null) {
  if (!ref) return "Direct / None";
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, "");
  } catch {
    // sometimes it’s already a hostname
    return String(ref).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "Direct / None";
  }
}

function trafficLabel(t?: string | null) {
  const v = String(t || "direct").toLowerCase();
  if (v.includes("organic")) return "organic";
  if (v.includes("paid")) return "paid";
  if (v.includes("ref")) return "referral";
  return "direct";
}

function fmt(n: number) {
  return n.toLocaleString("en-MY");
}

function toHourLabel(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  return `${hh}:00`;
}

export default function SiteEventsClient({
  rows,
  initialFrom,
  initialTo,
  initialPreset,
}: {
  rows: SiteEventRow[];
  initialFrom: string;
  initialTo: string;
  initialPreset: string;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [preset, setPreset] = useState(initialPreset);

  // -------------------------
  // KPI / Aggregations
  // -------------------------
  const computed = useMemo(() => {
    const traffic = { direct: 0, organic: 0, paid: 0, referral: 0 };
    const pageViews = new Map<string, number>();
    const modelClicks = new Map<string, number>();
    const whatsappByModel = new Map<string, number>();
    const callByModel = new Map<string, number>();
    const topReferrers = new Map<string, number>();

    const sessionsAll = new Set<string>();

    // "active users" = last 5 minutes unique session/anon
    const now = Date.now();
    const active5m = new Set<string>();

    // funnel: car detail view => whatsapp (same session)
    const carDetailViewSessions = new Set<string>();
    const whatsappSessions = new Set<string>();

    // mini chart: hourly buckets
    const buckets = new Map<string, Bucket>();

    for (const r of rows) {
      const sid = r.session_id || r.anon_id || "";
      if (sid) sessionsAll.add(sid);

      const tt = trafficLabel(r.traffic_type) as keyof typeof traffic;
      traffic[tt] += 1;

      const dom = refDomain(r.referrer);
      topReferrers.set(dom, (topReferrers.get(dom) || 0) + 1);

      // page views per path
      if (r.event_name === "page_view" && r.page_path) {
        pageViews.set(r.page_path, (pageViews.get(r.page_path) || 0) + 1);
      }

      // active users
      const ts = new Date(r.created_at).getTime();
      if (sid && now - ts <= 5 * 60 * 1000) active5m.add(sid);

      const looksCarDetail = isCarDetailPath(r.page_path);
      const isCarDetailsEvent =
        (r.event_name === "page_view" || r.event_name === "site_load") && looksCarDetail;

      // model counting logic (FIXED):
      // include:
      // - model_click
      // - whatsapp_click
      // - phone_click
      // - page_view/site_load on car detail path
      const shouldCountModel =
        r.event_name === "model_click" ||
        r.event_name === "whatsapp_click" ||
        r.event_name === "phone_click" ||
        isCarDetailsEvent;

      if (shouldCountModel) {
        const key = extractModelKey(r);
        if (key) {
          modelClicks.set(key, (modelClicks.get(key) || 0) + 1);
          if (r.event_name === "whatsapp_click") {
            whatsappByModel.set(key, (whatsappByModel.get(key) || 0) + 1);
          }
          if (r.event_name === "phone_click") {
            callByModel.set(key, (callByModel.get(key) || 0) + 1);
          }
        }
      }

      // funnel sets (same session)
      if (sid && isCarDetailsEvent) carDetailViewSessions.add(sid);
      if (sid && r.event_name === "whatsapp_click") whatsappSessions.add(sid);

      // traffic over time buckets (hour)
      const d = new Date(r.created_at);
      const label = toHourLabel(d);
      const existing =
        buckets.get(label) ||
        { label, direct: 0, organic: 0, paid: 0, referral: 0, total: 0 };
      existing[tt] += 1;
      existing.total += 1;
      buckets.set(label, existing);
    }

    const topModels: TopItem[] = Array.from(modelClicks.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    const topPages: TopItem[] = Array.from(pageViews.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    const referrers: TopItem[] = Array.from(topReferrers.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    const whatsappClicks = rows.filter((r) => r.event_name === "whatsapp_click").length;
    const phoneClicks = rows.filter((r) => r.event_name === "phone_click").length;

    const funnelView = carDetailViewSessions.size;
    const funnelWhats = new Set(
      Array.from(whatsappSessions).filter((sid) => carDetailViewSessions.has(sid))
    ).size;

    const funnelRate = funnelView > 0 ? (funnelWhats / funnelView) * 100 : 0;

    const series: Bucket[] = Array.from(buckets.values()).sort((a, b) => a.label.localeCompare(b.label));

    return {
      traffic,
      activeUsers: active5m.size,
      totalUsers: sessionsAll.size,
      whatsappClicks,
      phoneClicks,
      topModels,
      topPages,
      referrers,
      whatsappByModel,
      callByModel,
      series,
      funnelView,
      funnelWhats,
      funnelRate,
    };
  }, [rows]);

  // -------------------------
  // UI helpers
  // -------------------------
  const applyPreset = (p: string) => {
    setPreset(p);
    // just change URL; server re-runs and returns correct rows
    const qs = new URLSearchParams(window.location.search);
    qs.set("preset", p);
    qs.delete("from");
    qs.delete("to");
    window.location.href = `/admin/site-events?${qs.toString()}`;
  };

  const applyCustom = () => {
    const qs = new URLSearchParams(window.location.search);
    qs.set("preset", "custom");
    qs.set("from", from);
    qs.set("to", to);
    window.location.href = `/admin/site-events?${qs.toString()}`;
  };

  const trafficTotal =
    computed.traffic.direct + computed.traffic.organic + computed.traffic.paid + computed.traffic.referral;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-black text-gray-900">Site Events</div>
          <div className="text-sm text-gray-500">
            GA-style view • Logs from <span className="font-semibold">{from}</span> to{" "}
            <span className="font-semibold">{to}</span>
          </div>
        </div>

        <Link
          href="/admin"
          className="text-xs font-semibold px-3 py-2 rounded border bg-white hover:bg-gray-50"
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => applyPreset("24h")} className={btn(preset === "24h")}>Last 24h</button>
            <button onClick={() => applyPreset("7d")} className={btn(preset === "7d")}>Last 7d</button>
            <button onClick={() => applyPreset("30d")} className={btn(preset === "30d")}>Last 30d</button>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <div className="text-[11px] font-semibold text-gray-500">From</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-500">To</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
              />
            </div>
            <button onClick={applyCustom} className="text-sm font-bold px-4 py-2 rounded bg-black text-white">
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi title="Active Users (5m)" value={computed.activeUsers} tone="indigo" />
        <Kpi title="Users (range)" value={computed.totalUsers} tone="sky" />
        <Kpi title="WhatsApp" value={computed.whatsappClicks} tone="emerald" />
        <Kpi title="Calls" value={computed.phoneClicks} tone="rose" />
        <Kpi title="Organic" value={computed.traffic.organic} tone="emerald" />
        <Kpi title="Direct" value={computed.traffic.direct} tone="amber" />
      </div>

      {/* Traffic Mix + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-sm font-black text-gray-900 mb-2">Traffic Mix</div>
          <div className="flex flex-wrap gap-2">
            <Pill label={`Direct ${computed.traffic.direct}`} />
            <Pill label={`Organic ${computed.traffic.organic}`} />
            <Pill label={`Paid ${computed.traffic.paid}`} />
            <Pill label={`Referral ${computed.traffic.referral}`} />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Total events: <span className="font-semibold">{fmt(trafficTotal)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 lg:col-span-2">
          <div className="text-sm font-black text-gray-900 mb-3">Conversion Funnel</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FunnelCard title="Car Detail Views" value={computed.funnelView} />
            <FunnelCard title="WhatsApp (same session)" value={computed.funnelWhats} />
            <FunnelCard title="View → WhatsApp" value={`${computed.funnelRate.toFixed(1)}%`} />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            * “Car detail view” counts sessions where a <span className="font-semibold">page_view</span> or{" "}
            <span className="font-semibold">site_load</span> happened on <span className="font-semibold">/cars/:slug</span>
          </div>
        </div>
      </div>

      {/* Mini charts (hourly) */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="text-sm font-black text-gray-900 mb-2">Traffic Over Time (hourly)</div>
        <div className="overflow-x-auto">
          <div className="min-w-225">
            <div className="grid grid-cols-12 gap-2 text-[11px] text-gray-500 font-semibold mb-2">
              <div className="col-span-2">Hour</div>
              <div className="col-span-10">Events</div>
            </div>

            {computed.series.length ? (
              computed.series.map((b) => (
                <div key={b.label} className="grid grid-cols-12 gap-2 items-center py-1">
                  <div className="col-span-2 text-xs font-semibold text-gray-700">{b.label}</div>
                  <div className="col-span-10">
                    <div className="h-3 bg-gray-100 rounded overflow-hidden flex">
                      <Bar w={b.total} part={b.direct} total={b.total} cls="bg-amber-400" />
                      <Bar w={b.total} part={b.organic} total={b.total} cls="bg-emerald-400" />
                      <Bar w={b.total} part={b.paid} total={b.total} cls="bg-sky-400" />
                      <Bar w={b.total} part={b.referral} total={b.total} cls="bg-purple-400" />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      total {fmt(b.total)} • direct {fmt(b.direct)} • organic {fmt(b.organic)} • paid {fmt(b.paid)} • ref {fmt(b.referral)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400 py-6">No chart data</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Models / Top Pages / Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Top Models (all car activity)">
          <RankList
            items={computed.topModels}
            rightLabel="Events"
            empty="No model activity"
            extra={(key) => {
              const wa = computed.whatsappByModel.get(key) || 0;
              const call = computed.callByModel.get(key) || 0;
              return (
                <div className="text-[11px] text-gray-500">
                  WA {wa} • Calls {call}
                </div>
              );
            }}
          />
        </Panel>

        <Panel title="Top Pages (page_view count)">
          <RankList items={computed.topPages} rightLabel="Views" empty="No page views" />
        </Panel>

        <Panel title="Top Referrers (domains)">
          <RankList items={computed.referrers} rightLabel="Events" empty="No referrers" />
        </Panel>
      </div>

      {/* FULL raw logs */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <div className="font-black text-gray-900">Raw Logs</div>
            <div className="text-xs text-gray-500">Showing up to 5000 rows • props expanded</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-350 w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">Traffic</th>
                <th className="px-3 py-2 text-left">Page</th>
                <th className="px-3 py-2 text-left">Referrer</th>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">Session</th>
                <th className="px-3 py-2 text-left">UTM</th>
                <th className="px-3 py-2 text-left">Props</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const props = safeParseProps(r.props);
                const utm = [
                  r.utm_source && `src:${r.utm_source}`,
                  r.utm_medium && `med:${r.utm_medium}`,
                  r.utm_campaign && `camp:${r.utm_campaign}`,
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                      {new Date(r.created_at).toLocaleString("en-MY")}
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{r.event_name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${trafficPill(r.traffic_type)}`}>
                        {trafficLabel(r.traffic_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{r.page_path || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="font-semibold">{refDomain(r.referrer)}</div>
                      <div className="text-[11px] text-gray-500 break-all">{r.referrer || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{r.device_type || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="text-[11px]">sid: {r.session_id || "—"}</div>
                      <div className="text-[11px] text-gray-500">anon: {r.anon_id || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-600">{utm || "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-700">
                      <pre className="max-w-130 whitespace-pre-wrap wrap-break-word bg-gray-50 border rounded p-2">
                        {JSON.stringify(props, null, 2)}
                      </pre>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No events for this range
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

function btn(active: boolean) {
  return `text-sm font-bold px-3 py-2 rounded border ${
    active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
  }`;
}

function Pill({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
      {label}
    </span>
  );
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
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="font-black text-gray-900">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function RankList({
  items,
  rightLabel,
  empty,
  extra,
}: {
  items: { key: string; count: number }[];
  rightLabel: string;
  empty: string;
  extra?: (key: string) => React.ReactNode;
}) {
  if (!items.length) return <div className="text-sm text-gray-400">{empty}</div>;

  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((m, i) => (
        <div key={m.key} className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold mt-0.5">
              {i + 1}
            </span>
            <div>
              <div className="font-semibold text-gray-900">{m.key}</div>
              {extra ? extra(m.key) : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500">{rightLabel}</div>
            <div className="font-black text-gray-900">{m.count}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-xl border p-3 bg-gray-50">
      <div className="text-[11px] font-semibold text-gray-500 uppercase">{title}</div>
      <div className="text-xl font-black text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Bar({ part, total, cls }: { w: number; part: number; total: number; cls: string }) {
  if (!total || part <= 0) return null;
  const pct = (part / total) * 100;
  return <div className={`${cls}`} style={{ width: `${pct}%` }} />;
}

function trafficPill(t?: string | null) {
  const v = trafficLabel(t);
  if (v === "organic") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (v === "paid") return "bg-sky-50 border-sky-200 text-sky-700";
  if (v === "referral") return "bg-purple-50 border-purple-200 text-purple-700";
  return "bg-amber-50 border-amber-200 text-amber-700";
}
