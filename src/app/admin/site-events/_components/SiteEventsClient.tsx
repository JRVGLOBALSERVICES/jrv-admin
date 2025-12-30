// src/app/admin/site-events/_components/SiteEventsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SiteEventRow } from "@/lib/site-events";
import {
  inferTrafficTypeEnhanced,
  parseUrlParams,
  referrerLabel,
  safeParseProps,
  getModelKey,
  getCampaignKey,
} from "@/lib/site-events";

/* ===========================
   Types
=========================== */

type CampaignRow = {
  campaign: string;
  count: number;
  views: number;
  whatsapp: number;
  calls: number;
  conversions: number;
  rate: number;
};

type Summary = {
  ok?: boolean;

  // existing fields
  activeUsersRealtime: number;
  pageViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: { key: string; count: number }[];
  topReferrers: { name: string; count: number }[];
  trafficSeries: { t: string; v: number }[];
  funnel: { model: string; views: number; whatsapp: number; rate: number }[];
  campaigns: CampaignRow[];

  // optional compare blocks (if your API returns them)
  current?: any;
  previous?: any;
  compare?: any;
};

type ComputedRow = SiteEventRow & {
  propsObj: any;
  trafficFixed: string;
  refName: string;
  modelKey: string;
  campaignKey: string;
  adsLabel: string;
};

/* ===========================
   Small helpers
=========================== */

function clampDateValue(iso: string) {
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

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtPct(p: number) {
  if (!Number.isFinite(p)) return "—";
  const x = Math.round(p * 100);
  return `${x > 0 ? "+" : ""}${x}%`;
}

/* ===========================
   Filters + range from URL
=========================== */

type RangeKey = "24h" | "7d" | "30d" | "custom";

function getRangeFromKey(range: RangeKey) {
  const now = new Date();
  if (range === "24h") {
    return {
      fromIso: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      toIso: now.toISOString(),
    };
  }
  if (range === "7d") {
    return {
      fromIso: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      toIso: now.toISOString(),
    };
  }
  if (range === "30d") {
    return {
      fromIso: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      toIso: now.toISOString(),
    };
  }
  // custom is handled elsewhere
  return { fromIso: startOfDayIso(now), toIso: endOfDayIso(now) };
}

/* ===========================
   Component
=========================== */

export default function SiteEventsClient({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // read URL params
  const rangeKey = (sp.get("range") as RangeKey) || "custom";
  const eventFilter = sp.get("event") || "";
  const trafficFilter = sp.get("traffic") || "";
  const deviceFilter = sp.get("device") || "";
  const pathContains = sp.get("path") || "";

  // date range logic
  const urlFrom = sp.get("from") || "";
  const urlTo = sp.get("to") || "";

  const [fromIso, setFromIso] = useState(() => {
    if (rangeKey !== "custom") return getRangeFromKey(rangeKey).fromIso;
    return urlFrom ? new Date(urlFrom).toISOString() : initialFrom;
  });
  const [toIso, setToIso] = useState(() => {
    if (rangeKey !== "custom") return getRangeFromKey(rangeKey).toIso;
    return urlTo ? new Date(urlTo).toISOString() : initialTo;
  });

  // keep internal range in sync when rangeKey changes
  useEffect(() => {
    if (rangeKey === "custom") {
      // prefer URL custom yyyy-mm-dd
      if (urlFrom) {
        const d = new Date(urlFrom);
        if (!isNaN(d.getTime())) setFromIso(startOfDayIso(d));
      } else {
        setFromIso(initialFrom);
      }
      if (urlTo) {
        const d = new Date(urlTo);
        if (!isNaN(d.getTime())) setToIso(endOfDayIso(d));
      } else {
        setToIso(initialTo);
      }
    } else {
      const r = getRangeFromKey(rangeKey);
      setFromIso(r.fromIso);
      setToIso(r.toIso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, urlFrom, urlTo]);

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
        // server-side limit (keep low to avoid big payload; we page/virtualize later if needed)
        limit: "800",
      });

      const [a, b] = await Promise.all([
        fetch(`/api/admin/site-events?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/site-events/summary?${qs.toString()}`, {
          cache: "no-store",
        }),
      ]);

      const aj = await a.json();
      const bj = await b.json();

      setRows(aj?.rows || []);
      setSummary(bj?.ok ? bj : null);
    } finally {
      setLoading(false);
    }
  }

  // load when range changes
  useEffect(() => {
    loadAll();
    // keep shareable in URL: when not custom, we set range key only; when custom, set from/to
    const next = new URLSearchParams(sp.toString());

    if (rangeKey !== "custom") {
      next.set("range", rangeKey);
      next.delete("from");
      next.delete("to");
    } else {
      next.set("range", "custom");
      next.set("from", fromDate);
      next.set("to", toDate);
    }

    router.replace(`/admin/site-events?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIso, toIso]);

  // realtime refresh summary only
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ from: fromIso, to: toIso });
        const r = await fetch(
          `/api/admin/site-events/summary?${qs.toString()}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (j?.ok) setSummary(j);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [fromIso, toIso]);

  const computed: ComputedRow[] = useMemo(() => {
    return rows.map((r) => {
      const propsObj = safeParseProps(r.props);
      const trafficFixed = inferTrafficTypeEnhanced(r);
      const refName = referrerLabel(r);
      const urlParams = parseUrlParams(r.page_url);

      const modelKey = getModelKey(r);
      const campaignKey = getCampaignKey(r) || "—";

      const isAds = String(trafficFixed).toLowerCase() === "paid";
      const adsLabel = isAds
        ? `Google Ads • ${
            campaignKey !== "—" ? `camp:${campaignKey}` : "camp:-"
          } • gclid:${urlParams.gclid ? "yes" : "no"}`
        : "";

      return {
        ...r,
        propsObj,
        trafficFixed,
        refName,
        modelKey,
        campaignKey,
        adsLabel,
      };
    });
  }, [rows]);

  // client-side filters (fast for <= 5k rows; for >5k do it server-side with params)
  const filtered: ComputedRow[] = useMemo(() => {
    const ev = eventFilter.trim().toLowerCase();
    const tr = trafficFilter.trim().toLowerCase();
    const dv = deviceFilter.trim().toLowerCase();
    const pc = pathContains.trim().toLowerCase();

    return computed.filter((r) => {
      if (ev && String(r.event_name || "").toLowerCase() !== ev) return false;
      if (tr && String(r.trafficFixed || "").toLowerCase() !== tr) return false;
      if (
        dv &&
        String((r as any).device_type || "unknown").toLowerCase() !== dv
      )
        return false;
      if (
        pc &&
        !String(r.page_path || "")
          .toLowerCase()
          .includes(pc)
      )
        return false;
      return true;
    });
  }, [computed, eventFilter, trafficFilter, deviceFilter, pathContains]);

  const pagePathCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      if (String(r.event_name).toLowerCase() !== "page_view") continue;
      const key = r.page_path || "(unknown)";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filtered]);

  const trafficFixedCounts = useMemo(() => {
    const base = { direct: 0, organic: 0, paid: 0, referral: 0 };
    for (const r of filtered) {
      const t = String(
        r.trafficFixed || "direct"
      ).toLowerCase() as keyof typeof base;
      base[t] = (base[t] || 0) + 1;
    }
    return base;
  }, [filtered]);

  const topCampaignsLocal: CampaignRow[] = useMemo(() => {
    const counts = new Map<
      string,
      { count: number; views: number; wa: number; calls: number }
    >();

    for (const r of filtered) {
      const c = r.campaignKey || "—";
      const en = String(r.event_name || "").toLowerCase();
      const isCarDetail = !!(r.page_path || "").match(/^\/cars\/[^/]+\/?$/i);

      const prev = counts.get(c) || { count: 0, views: 0, wa: 0, calls: 0 };
      prev.count += 1;

      if (isCarDetail && (en === "page_view" || en === "site_load"))
        prev.views += 1;
      if (en === "whatsapp_click") prev.wa += 1;
      if (en === "phone_click") prev.calls += 1;

      counts.set(c, prev);
    }

    return Array.from(counts.entries())
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
  }, [filtered]);

  const s: Summary = summary || {
    activeUsersRealtime: 0,
    pageViews: pagePathCounts.reduce((a, b) => a + b.count, 0),
    whatsappClicks: filtered.filter(
      (x) => String(x.event_name).toLowerCase() === "whatsapp_click"
    ).length,
    phoneClicks: filtered.filter(
      (x) => String(x.event_name).toLowerCase() === "phone_click"
    ).length,
    traffic: trafficFixedCounts,
    topModels: [],
    topReferrers: [],
    trafficSeries: [],
    funnel: [],
    campaigns: topCampaignsLocal,
  };

  const trafficTotal =
    toNum(s.traffic.direct) +
      toNum(s.traffic.organic) +
      toNum(s.traffic.paid) +
      toNum(s.traffic.referral) || 1;

  const compare = summary?.compare || null;

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-black text-gray-900">
              Site Events • GA Style
            </div>
            <div className="text-xs text-gray-600">
              Google split: <b>Google (Organic)</b> vs <b>Google Ads</b>.
              Campaigns prefer <code>utm_campaign</code> → fallback{" "}
              <code>gad_campaignid</code>.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-gray-600">
              Date range
            </div>

            {/* local quick range */}
            <select
              value={rangeKey}
              onChange={(e) => {
                const next = new URLSearchParams(sp.toString());
                next.set("range", e.target.value);
                router.push(`/admin/site-events?${next.toString()}`);
              }}
              className="text-xs border rounded-lg px-2 py-2 bg-white"
              title="Range"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="custom">Custom</option>
            </select>

            <input
              type="date"
              value={fromDate}
              disabled={rangeKey !== "custom"}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setFromIso(startOfDayIso(d));
              }}
              className={`text-xs border rounded-lg px-2 py-2 bg-white ${
                rangeKey !== "custom" ? "opacity-60" : ""
              }`}
            />
            <span className="text-xs text-gray-500">→</span>
            <input
              type="date"
              value={toDate}
              disabled={rangeKey !== "custom"}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setToIso(endOfDayIso(d));
              }}
              className={`text-xs border rounded-lg px-2 py-2 bg-white ${
                rangeKey !== "custom" ? "opacity-60" : ""
              }`}
            />

            <button
              onClick={loadAll}
              className="text-xs font-semibold px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi
            title="Realtime Active (5m)"
            value={s.activeUsersRealtime}
            tone="indigo"
          >
            {compare?.activeUsersRealtime ? (
              <DeltaPill
                delta={compare.activeUsersRealtime.delta}
                pct={compare.activeUsersRealtime.pct}
              />
            ) : null}
          </Kpi>

          <Kpi title="Page Views" value={s.pageViews} tone="sky">
            {compare?.pageViews ? (
              <DeltaPill
                delta={compare.pageViews.delta}
                pct={compare.pageViews.pct}
              />
            ) : null}
          </Kpi>

          <Kpi title="WhatsApp" value={s.whatsappClicks} tone="emerald">
            {compare?.whatsappClicks ? (
              <DeltaPill
                delta={compare.whatsappClicks.delta}
                pct={compare.whatsappClicks.pct}
              />
            ) : null}
          </Kpi>

          <Kpi title="Calls" value={s.phoneClicks} tone="rose">
            {compare?.phoneClicks ? (
              <DeltaPill
                delta={compare.phoneClicks.delta}
                pct={compare.phoneClicks.pct}
              />
            ) : null}
          </Kpi>

          <Kpi title="Organic" value={s.traffic.organic} tone="emerald">
            {compare?.traffic?.organic ? (
              <DeltaPill
                delta={compare.traffic.organic.delta}
                pct={compare.traffic.organic.pct}
              />
            ) : null}
          </Kpi>

          <Kpi title="Paid" value={s.traffic.paid} tone="amber">
            {compare?.traffic?.paid ? (
              <DeltaPill
                delta={compare.traffic.paid.delta}
                pct={compare.traffic.paid.pct}
              />
            ) : null}
          </Kpi>
        </div>

        {/* Traffic mix + chart */}
        <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Traffic Mix with mini bars */}
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Traffic Mix
            </div>

            <div className="space-y-2">
              <MixRow
                label="Direct"
                value={s.traffic.direct}
                total={trafficTotal}
                tone="slate"
              />
              <MixRow
                label="Organic"
                value={s.traffic.organic}
                total={trafficTotal}
                tone="emerald"
              />
              <MixRow
                label="Paid"
                value={s.traffic.paid}
                total={trafficTotal}
                tone="amber"
              />
              <MixRow
                label="Referral"
                value={s.traffic.referral}
                total={trafficTotal}
                tone="sky"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label={`Direct ${s.traffic.direct}`} />
              <Pill label={`Organic ${s.traffic.organic}`} />
              <Pill label={`Paid ${s.traffic.paid}`} />
              <Pill label={`Referral ${s.traffic.referral}`} />
            </div>

            <div className="text-[11px] text-gray-500 mt-2">
              ✅ Paid detected via gclid/gbraid/wbraid/gad_campaignid/gad_source
            </div>
          </div>

          {/* Sparkline */}
          <div className="rounded-xl border p-3 bg-white lg:col-span-2">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              📈 Traffic Over Time
            </div>
            {s.trafficSeries?.length ? (
              <Sparkline series={s.trafficSeries.map((x) => x.v)} />
            ) : (
              <div className="text-sm text-gray-400">No chart data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick filters */}
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50 font-semibold text-gray-900">
          Filters
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <SelectParam
              label="Event"
              param="event"
              value={eventFilter}
              options={[
                ["", "All"],
                ["site_load", "site_load"],
                ["page_view", "page_view"],
                ["model_click", "model_click"],
                ["whatsapp_click", "whatsapp_click"],
                ["phone_click", "phone_click"],
                ["car_image_click", "car_image_click"],
                ["location_click", "location_click"],
                ["service_click", "service_click"],
              ]}
            />

            <SelectParam
              label="Traffic"
              param="traffic"
              value={trafficFilter}
              options={[
                ["", "All"],
                ["direct", "Direct"],
                ["organic", "Organic"],
                ["paid", "Paid"],
                ["referral", "Referral"],
              ]}
            />

            <SelectParam
              label="Device"
              param="device"
              value={deviceFilter}
              options={[
                ["", "All"],
                ["desktop", "Desktop"],
                ["mobile", "Mobile"],
                ["tablet", "Tablet"],
                ["unknown", "Unknown"],
              ]}
            />

            <TextParam
              label="Path contains"
              param="path"
              value={pathContains}
              placeholder="/cars/"
            />
          </div>
        </div>
      </div>

      {/* Campaign funnel card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="🎯 Top Campaigns Funnel (Views → WhatsApp → Calls)"
          headerClass="bg-gradient-to-r from-amber-50 via-rose-50 to-indigo-50"
        >
          <div className="space-y-3">
            {(s.campaigns?.length ? s.campaigns : topCampaignsLocal)
              .slice(0, 12)
              .map((c, i) => {
                const list = s.campaigns?.length
                  ? s.campaigns
                  : topCampaignsLocal;
                const maxViews = Math.max(...list.map((x) => x.views), 1);

                const viewPct = Math.min(100, (c.views / maxViews) * 100);
                const waPct =
                  c.views > 0 ? Math.min(100, (c.whatsapp / c.views) * 100) : 0;
                const callPct =
                  c.views > 0 ? Math.min(100, (c.calls / c.views) * 100) : 0;

                return (
                  <div
                    key={`${c.campaign}-${i}`}
                    className="rounded-xl border bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-black border border-amber-200">
                            {i + 1}
                          </span>
                          <div className="font-semibold text-gray-900 truncate max-w-[320px]">
                            {c.campaign}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Views <b>{c.views}</b> • WhatsApp <b>{c.whatsapp}</b>{" "}
                          • Calls <b>{c.calls}</b> • Events <b>{c.count}</b>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-700">
                          {c.conversions}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          conversions
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          WA rate: <b>{Math.round((c.rate || 0) * 100)}%</b>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <Bar
                        label="Views"
                        pct={viewPct}
                        tone="indigo"
                        value={c.views}
                      />
                      <Bar
                        label="WhatsApp"
                        pct={waPct}
                        tone="emerald"
                        value={c.whatsapp}
                      />
                      <Bar
                        label="Calls"
                        pct={callPct}
                        tone="rose"
                        value={c.calls}
                      />
                    </div>

                    {c.campaign === "—" && (
                      <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        This means the event didn’t contain{" "}
                        <code>utm_campaign</code> or <code>gad_campaignid</code>
                        . Best fix: write campaign into <code>props</code> on
                        the first hit and reuse for later events.
                      </div>
                    )}
                  </div>
                );
              })}

            {!(s.campaigns?.length ? s.campaigns : topCampaignsLocal)
              .length && (
              <div className="text-sm text-gray-400">
                No campaigns detected yet
              </div>
            )}
          </div>
        </Card>

        <Card
          title="🔗 Top Referrers (Google split)"
          headerClass="bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50"
        >
          <div className="space-y-2">
            {(s.topReferrers || []).slice(0, 15).map((r, i) => (
              <div
                key={r.name}
                className="flex items-center justify-between text-sm border rounded-xl p-3 bg-white"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black border border-indigo-200">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900">{r.name}</span>
                </div>
                <span className="font-black text-gray-900">{r.count}</span>
              </div>
            ))}
            {!s.topReferrers?.length && (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Page path count */}
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50">
          <div className="font-semibold text-gray-900">
            Page Views by Page Path
          </div>
          <div className="text-xs text-gray-500">
            Counts only page_view events (filtered)
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

      {/* Full events table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">
              All Events (Full Data)
            </div>
            <div className="text-xs text-gray-500">
              Rows highlight Paid/Organic/Referral with a colored left border
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {loading ? "Loading…" : `${filtered.length} rows`}
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
                <th className="px-4 py-3 text-left">Ads Meta</th>
                <th className="px-4 py-3 text-left">Props</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`${rowBorder(r.trafficFixed)} hover:bg-gray-50`}
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
                    <div className="text-[11px] text-gray-500 truncate max-w-[240px]">
                      {(r as any).referrer || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold">
                      {r.campaignKey || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {r.modelKey}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {r.adsLabel ? (
                      <span className="px-2 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 font-semibold">
                        {r.adsLabel}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <pre className="text-[11px] bg-gray-50 border rounded-xl p-2 max-w-[520px] overflow-auto">
                      {JSON.stringify(r.propsObj || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No events in this range / filters.
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

/* ===========================
   UI helpers
=========================== */

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

function Card({
  title,
  children,
  headerClass = "bg-gray-50",
}: {
  title: string;
  children: any;
  headerClass?: string;
}) {
  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
      <div
        className={`p-4 border-b font-semibold text-gray-900 ${headerClass}`}
      >
        {title}
      </div>
      <div className="p-4">{children}</div>
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

function DeltaPill({ delta, pct }: { delta: number; pct: number }) {
  const up = delta > 0;
  const down = delta < 0;
  const cls = up
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : down
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`text-[11px] font-black px-2 py-1 rounded-full border ${cls}`}
    >
      {delta > 0 ? "+" : ""}
      {delta} • {fmtPct(pct)}
    </span>
  );
}

function Kpi({
  title,
  value,
  tone,
  children,
}: {
  title: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "sky" | "indigo";
  children?: React.ReactNode;
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
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-black uppercase opacity-80">
          {title}
        </div>
        {children}
      </div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
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
      <div className="text-[11px] text-gray-500 mt-1">
        Updated every 5s • event volume trend
      </div>
    </div>
  );
}

/* ===========================
   URL param controls
=========================== */

function SelectParam({
  label,
  param,
  value,
  options,
}: {
  label: string;
  param: string;
  value: string;
  options: [string, string][];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(v: string) {
    const next = new URLSearchParams(sp.toString());
    if (!v) next.delete(param);
    else next.set(param, v);
    router.push(`/admin/site-events?${next.toString()}`);
  }

  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      <select
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
        value={value || ""}
        onChange={(e) => setParam(e.target.value)}
      >
        {options.map(([val, text]) => (
          <option key={val || "__"} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextParam({
  label,
  param,
  value,
  placeholder,
}: {
  label: string;
  param: string;
  value: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(v: string) {
    const next = new URLSearchParams(sp.toString());
    if (!v) next.delete(param);
    else next.set(param, v);
    router.push(`/admin/site-events?${next.toString()}`);
  }

  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      <input
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => setParam(e.target.value)}
      />
    </div>
  );
}
