"use client";

import { useEffect, useState } from "react";
import { Wifi, Megaphone, MapPin, Globe, Activity, Smartphone, Link2 } from "lucide-react";
import GaStatCard from "./GaStatCard";
import { rankBadge } from "../../_lib/utils";

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

export default function SiteEventsClient({
  initialFrom,
  initialTo,
  initialRange,
  initialFilters,
}: any) {
  // Trends state
  const [trends, setTrends] = useState<any>({});

  // UI State
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [isNewUserEntry, setIsNewUserEntry] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchStats(isPolling = false) {
      if (!isPolling) setLoading(true);
      try {
        const params = {
          from: initialFrom,
          to: initialTo,
          ...(initialFilters?.event ? { event: initialFilters.event } : {}),
          ...(initialFilters?.traffic ? { traffic: initialFilters.traffic } : {}),
          ...(initialFilters?.device ? { device: initialFilters.device } : {}),
          ...(initialFilters?.path ? { path: initialFilters.path } : {}),
        };
        const qs = new URLSearchParams(params);

        // Parallel fetch for current and previous period (for trends)
        // Calculate previous period
        const start = new Date(initialFrom);
        const end = new Date(initialTo);
        const diffTime = end.getTime() - start.getTime();
        const prevFrom = new Date(start.getTime() - diffTime).toISOString();
        const prevTo = new Date(end.getTime() - diffTime).toISOString();

        const prevParams = { ...params, from: prevFrom, to: prevTo };
        const prevQs = new URLSearchParams(prevParams);

        const [res, prevRes] = await Promise.all([
          fetch(`/api/admin/site-events/summary?${qs}`),
          fetch(`/api/admin/site-events/summary?${prevQs}`)
        ]);

        const json = await res.json();
        const prevJson = await prevRes.json();

        if (mounted && json.ok) {
          setData(json);

          // Pulse effect if active users increased
          if (json.activeUsers > (data?.activeUsers || 0)) {
            setIsNewUserEntry(true);
            setTimeout(() => setIsNewUserEntry(false), 3000);
          }

          // Calculate trends (Refined logic)
          if (prevJson.ok) {
            const getTrend = (curr: number, prev: number) => {
              if (prev === 0 && curr === 0) return "0%";
              if (prev === 0) return "+100%"; // Or "New"
              const diff = ((curr - prev) / prev) * 100;
              if (diff === 0) return "0%";
              return `${diff > 0 ? "+" : ""}${Math.round(diff)}%`;
            };

            setTrends({
              activeUsers: getTrend(json.activeUsers, prevJson.activeUsers),
              uniqueVisitors: getTrend(json.uniqueVisitors, prevJson.uniqueVisitors),
              pageViews: getTrend(json.pageViews, prevJson.pageViews),
              whatsappClicks: getTrend(json.whatsappClicks, prevJson.whatsappClicks),
              phoneClicks: getTrend(json.phoneClicks, prevJson.phoneClicks),
              paid: getTrend(json.traffic?.paid || 0, prevJson.traffic?.paid || 0),
              organic: getTrend(json.traffic?.organic || 0, prevJson.traffic?.organic || 0),
              direct: getTrend(json.traffic?.direct || 0, prevJson.traffic?.direct || 0),
            });
          }
        }
      } finally {
        if (mounted && !isPolling) setLoading(false);
      }
    }

    fetchStats(false); // Initial load

    // Countdown Timer
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    const interval = setInterval(() => {
      fetchStats(true);
      setCountdown(5); // Reset countdown on fetch
    }, 5000); // Poll every 5s

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [
    initialFrom,
    initialTo,
    initialRange, // Trigger re-feth on range change
    JSON.stringify(initialFilters),
  ]);

  const s = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header / Countdown */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">Realtime Overview</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
            Live
          </span>
          <div className="w-px h-3 bg-emerald-200 mx-1"></div>
          <div className="w-4 text-center font-mono text-emerald-600 font-bold text-xs">{countdown}s</div>
        </div>
      </div>

      {/* 1. KEY METRICS (GA4 Style Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* New Active Users KPI */}
        <GaStatCard
          title="Active Users (5 Min)"
          value={s?.activeUsers || 0}
          sub={trends.activeUsers}
          color="emerald"
          loading={loading && !data}
        />
        <GaStatCard
          title="Unique Users"
          value={s?.uniqueVisitors || 0}
          sub={trends.uniqueVisitors}
          color="orange"
          loading={loading && !data}
        />
        <GaStatCard
          title="Page Views"
          value={s?.pageViews || 0}
          sub={trends.pageViews}
          color="blue"
          loading={loading && !data}
        />
        <GaStatCard
          title="WhatsApp"
          value={s?.whatsappClicks || 0}
          sub={trends.whatsappClicks}
          color="green"
          loading={loading && !data}
        />
        <GaStatCard
          title="Calls"
          value={s?.phoneClicks || 0}
          sub={trends.phoneClicks}
          color="pink"
          loading={loading && !data}
        />
        <GaStatCard
          title="Paid Traffic"
          value={s?.traffic?.paid || 0}
          sub={trends.paid}
          color="purple"
          loading={loading && !data}
        />
        <GaStatCard
          title="Organic"
          value={s?.traffic?.organic || 0}
          sub={trends.organic}
          color="emerald"
          loading={loading && !data}
        />
        <GaStatCard
          title="Direct"
          value={s?.traffic?.direct || 0}
          sub={trends.direct}
          color="slate"
          loading={loading && !data}
        />
      </div>

      <div className="text-[11px] text-gray-500 font-semibold -mt-2">
        identity breakdown: anon {s?.uniqueAnonIds || 0} • session{" "}
        {s?.uniqueSessions || 0} • ip {s?.uniqueIps || 0}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. TOP CAMPAIGNS (New View) */}
        <Card
          title="Top Ads Campaigns"
          headerExtras={<Megaphone className="w-4 h-4 text-amber-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.campaigns || []).map((c: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-amber-50 rounded"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800 text-xs break-all">
                    {c.campaign}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {c.conversions} conversions
                  </span>
                </div>
                <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs">
                  {c.count}
                </span>
              </div>
            ))}
            {!s?.campaigns?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No active ad campaigns
              </div>
            )}
          </div>
        </Card>

        {/* 3. TOP MODELS (Cleaned) */}
        <Card
          title="Top Models"
          headerExtras={<Activity className="w-4 h-4 text-indigo-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topModels || []).map((m: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-indigo-50 rounded group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-700 group-hover:text-indigo-700">
                    {m.key}
                  </span>
                </div>
                <span className="font-bold text-gray-900">{m.count}</span>
              </div>
            ))}
            {!s?.topModels?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No model data
              </div>
            )}
          </div>
        </Card>

        {/* 3. TOP PAGES (New View) */}
        <Card
          title="Top Pages"
          headerExtras={<Activity className="w-4 h-4 text-blue-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topPages || []).slice(0, 10).map((p: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-blue-50 rounded group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-700 group-hover:text-blue-700 truncate max-w-[180px]" title={p.key}>
                    {p.key}
                  </span>
                </div>
                <span className="font-bold text-gray-900">{p.count}</span>
              </div>
            ))}
            {!s?.topPages?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No page data
              </div>
            )}
          </div>
        </Card>

        {/* 4. TOP CITIES (New Breakdown) */}
        <Card
          title="Top Cities (GPS)"
          headerExtras={<Globe className="w-4 h-4 text-emerald-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topCities || []).slice(0, 10).map((c: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-emerald-50 rounded"
              >
                <span className="font-medium text-gray-700 truncate max-w-[180px]">{c.name || c.key}</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {c.count || c.users}
                </span>
              </div>
            ))}
            {!s?.topCities?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No city data
              </div>
            )}
          </div>
        </Card>

        {/* 5. TOP DEVICES (New) */}
        <Card
          title="Top Devices"
          headerExtras={<Smartphone className="w-4 h-4 text-slate-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.devices || []).map((d: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded"
              >
                <span className="font-medium text-gray-700">{d.key}</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {d.count}
                </span>
              </div>
            ))}
            {!s?.devices?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No device data
              </div>
            )}
          </div>
        </Card>

        {/* 6. TOP ISPs (New) */}
        <Card
          title="Top ISPs"
          headerExtras={<Wifi className="w-4 h-4 text-sky-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topISP || []).slice(0, 10).map((isp: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-sky-50 rounded"
              >
                <span className="font-medium text-gray-700 truncate max-w-[180px]">{isp.name}</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {isp.count}
                </span>
              </div>
            ))}
            {!s?.topISP?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No ISP data
              </div>
            )}
          </div>
        </Card>

        {/* 7. TOP REFERRERS (New) */}
        <Card
          title="Top Referrers"
          headerExtras={<Link2 className="w-4 h-4 text-purple-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topReferrers || []).slice(0, 10).map((r: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-purple-50 rounded"
              >
                <span className="font-medium text-gray-700 truncate max-w-[180px]">{r.name}</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {r.count}
                </span>
              </div>
            ))}
            {!s?.topReferrers?.length && (
              <div className="text-gray-400 italic text-xs p-2">
                No referrer data
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 5. PRECISE LOCATION LOG */}
      <Card
        title="Recent Exact Locations"
        headerExtras={<MapPin className="w-4 h-4 text-rose-500" />}
      >
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-xs text-left relative">
            <thead className="bg-gray-50 text-gray-500 border-b sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-2 bg-gray-50">Time</th>
                <th className="px-4 py-2 bg-gray-50">City</th>
                <th className="px-4 py-2 bg-gray-50">Region</th>
                <th className="px-4 py-2 bg-gray-50">Exact Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(s?.latestGps || []).map((g: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-400">
                    {new Date(g.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {g.parsed.city}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{g.parsed.region}</td>
                  <td
                    className="px-4 py-2 text-gray-400 truncate max-w-62.5"
                    title={g.exact_address}
                  >
                    {g.exact_address}
                  </td>
                </tr>
              ))}
              {!s?.latestGps?.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400 italic">
                    No exact location data found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

