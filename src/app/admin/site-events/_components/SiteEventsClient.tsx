"use client";

import { useEffect, useState } from "react";
import { Wifi, Megaphone, MapPin, Globe, Activity, Smartphone, Link2, Users, Clock, Eye, X, ExternalLink, MessageCircle, Instagram as InstagramIcon, Facebook as FacebookIcon, Search, Zap } from "lucide-react";
import { rankBadge } from "../../_lib/utils";
import { getPageName } from "@/lib/site-events";
import GaStatCard from "./GaStatCard";

const PAGE_NAMES: Record<string, string> = {
  "/": "Homepage",
  "/cars": "Car List",
  "/about": "About Us",
  "/contact": "Contact Us",
  "/events": "Our Events",
  "/how-it-works": "How It Works",
  "/terms": "Terms & Conditions",
  "/privacy": "Privacy Policy",
  "/news-and-promotions": "News & Promotions",
  "/kereta-sewa-seremban/": "Kereta Sewa Seremban",
  "/kereta-sewa-senawang/": "Kereta Sewa Senawang",
  "/kereta-sewa-nilai/": "Kereta Sewa Nilai",
  "/kereta-sewa-klia-klia2/": "Kereta Sewa KLIA/KLIA2",
  "/sewa-kereta-mewah/": "Luxury Car Rental",
  "/honda-city-rs/": "Car: Honda City RS",
  "/sewa-kereta-pelajar/": "Sewa Kereta Pelajar",
};

function GlossyBadge({
  value,
  color = "indigo"
}: {
  value: number | string;
  color?: "emerald" | "amber" | "sky" | "pink" | "indigo" | "rose" | "slate"
}) {
  const themes = {
    emerald: "from-emerald-400 to-green-500 text-white border-emerald-300 shadow-emerald-100",
    amber: "from-amber-400 to-orange-500 text-white border-amber-300 shadow-amber-100",
    sky: "from-sky-400 to-blue-500 text-white border-sky-300 shadow-sky-100",
    pink: "from-pink-400 to-rose-500 text-white border-pink-300 shadow-pink-100",
    indigo: "from-indigo-400 to-purple-500 text-white border-indigo-300 shadow-indigo-100",
    rose: "from-rose-400 to-red-500 text-white border-rose-300 shadow-rose-100",
    slate: "from-slate-400 to-slate-600 text-white border-slate-300 shadow-slate-100",
  };

  const theme = themes[color] || themes.indigo;

  return (
    <div className={`relative px-2 py-0.5 rounded-lg border font-black text-[10px] bg-linear-to-br ${theme} shadow-xs overflow-hidden flex items-center justify-center min-w-[32px]`}>
      <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30 pointer-events-none" />
      <span className="relative z-10 drop-shadow-md">{value}</span>
    </div>
  );
}

function Card({ title, children, headerExtras, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden bg-white flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
        <div className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          {title}
        </div>
        {headerExtras}
      </div>
      <div className="p-0 flex-1">{children}</div>
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
  color: "slate" | "emerald" | "amber" | "sky" | "pink" | "indigo" | "rose";
}) {
  const pct = Math.round((value / Math.max(1, total)) * 100);
  const gradients = {
    emerald: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    sky: "from-sky-400 to-blue-500",
    slate: "from-slate-400 to-slate-600",
    pink: "from-pink-400 to-rose-500",
    indigo: "from-indigo-400 to-purple-500",
    rose: "from-rose-400 to-red-500",
  };

  const chosenGradient = gradients[color] || gradients.slate;

  return (
    <div className="group px-4 py-2 hover:bg-gray-50/50 rounded-xl transition-colors">
      <div className="flex items-center justify-between text-xs text-gray-700 mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full bg-linear-to-br ${chosenGradient} shadow-xs ring-2 ring-white`} />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-gray-500">
          <span className="font-bold text-gray-900">{value}</span> ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100/80 overflow-hidden shadow-inner border border-gray-200/50">
        <div
          className={`h-full rounded-full bg-linear-to-r ${chosenGradient} shadow-sm transition-all duration-1000 relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30" />
        </div>
      </div>
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
  const [prevStats, setPrevStats] = useState<any>({});

  // Session Detail Modal
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionEvents, setSessionEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

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
              returningUsers: getTrend(json.returningUsers || 0, prevJson.returningUsers || 0),
              pageViews: getTrend(json.pageViews, prevJson.pageViews),
              whatsappClicks: getTrend(json.whatsappClicks, prevJson.whatsappClicks),
              phoneClicks: getTrend(json.phoneClicks, prevJson.phoneClicks),
              ads: getTrend(json.traffic?.["Google Ads"] || 0, prevJson.traffic?.["Google Ads"] || 0),
              partners: getTrend(json.traffic?.["Google Search Partners"] || 0, prevJson.traffic?.["Google Search Partners"] || 0),
              organic: getTrend(json.traffic?.["Google Organic"] || 0, prevJson.traffic?.["Google Organic"] || 0),
              facebook: getTrend(json.traffic?.Facebook || 0, prevJson.traffic?.Facebook || 0),
              instagram: getTrend(json.traffic?.Instagram || 0, prevJson.traffic?.Instagram || 0),
              tiktok: getTrend(json.traffic?.TikTok || 0, prevJson.traffic?.TikTok || 0),
              direct: getTrend(json.traffic?.Direct || 0, prevJson.traffic?.Direct || 0),
            });

            setPrevStats({
              activeUsers: prevJson.activeUsers,
              uniqueVisitors: prevJson.uniqueVisitors,
              returningUsers: prevJson.returningUsers || 0,
              pageViews: prevJson.pageViews,
              whatsappClicks: prevJson.whatsappClicks,
              phoneClicks: prevJson.phoneClicks,
              ads: prevJson.traffic?.["Google Ads"] || 0,
              partners: prevJson.traffic?.["Google Search Partners"] || 0,
              organic: prevJson.traffic?.["Google Organic"] || 0,
              facebook: prevJson.traffic?.Facebook || 0,
              instagram: prevJson.traffic?.Instagram || 0,
              tiktok: prevJson.traffic?.TikTok || 0,
              direct: prevJson.traffic?.Direct || 0,
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

  // Fetch session details when selected
  useEffect(() => {
    if (!selectedSessionId) return;

    async function fetchSession() {
      setLoadingEvents(true);
      try {
        const res = await fetch(`/api/admin/site-events/session?id=${selectedSessionId}`);
        const json = await res.json();
        if (json.ok) setSessionEvents(json.events || []);
      } catch (e) {
        console.error("Failed to fetch session events", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchSession();
  }, [selectedSessionId]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* New Active Users KPI */}
        <GaStatCard
          title="Active Users"
          value={s?.activeUsers || 0}
          prevValue={prevStats.activeUsers}
          sub={trends.activeUsers}
          color="emerald"
          loading={loading && !data}
        />
        <GaStatCard
          title="Unique Users"
          value={s?.uniqueVisitors || 0}
          prevValue={prevStats.uniqueVisitors}
          sub={trends.uniqueVisitors}
          color="orange"
          loading={loading && !data}
        />
        <GaStatCard
          title="Returning"
          value={s?.returningUsers || 0}
          prevValue={prevStats.returningUsers}
          sub={trends.returningUsers}
          color="indigo"
          loading={loading && !data}
        />
        <GaStatCard
          title="Page Views"
          value={s?.pageViews || 0}
          prevValue={prevStats.pageViews}
          sub={trends.pageViews}
          color="blue"
          loading={loading && !data}
        />
        <GaStatCard
          title="WhatsApp"
          value={s?.whatsappClicks || 0}
          prevValue={prevStats.whatsappClicks}
          sub={trends.whatsappClicks}
          color="green"
          loading={loading && !data}
        />
        <GaStatCard
          title="Calls"
          value={s?.phoneClicks || 0}
          prevValue={prevStats.phoneClicks}
          sub={trends.phoneClicks}
          color="pink"
          loading={loading && !data}
        />
        <GaStatCard
          title="Google Ads"
          value={s?.traffic?.["Google Ads"] || 0}
          prevValue={prevStats.ads}
          sub={trends.ads}
          color="amber"
          loading={loading && !data}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <GaStatCard
          title="Search Partners"
          value={s?.traffic?.["Google Search Partners"] || 0}
          prevValue={prevStats.partners}
          sub={trends.partners}
          color="slate"
          loading={loading && !data}
        />
        <GaStatCard
          title="Google Organic"
          value={s?.traffic?.["Google Organic"] || 0}
          prevValue={prevStats.organic}
          sub={trends.organic}
          color="green"
          loading={loading && !data}
        />
        <GaStatCard
          title="Facebook"
          value={s?.traffic?.Facebook || 0}
          prevValue={prevStats.facebook}
          sub={trends.facebook}
          color="indigo"
          loading={loading && !data}
        />
        <GaStatCard
          title="Instagram"
          value={s?.traffic?.Instagram || 0}
          prevValue={prevStats.instagram}
          sub={trends.instagram}
          color="pink"
          loading={loading && !data}
        />
        <GaStatCard
          title="TikTok"
          value={s?.traffic?.TikTok || 0}
          prevValue={prevStats.tiktok}
          sub={trends.tiktok}
          color="rose"
          loading={loading && !data}
        />
        <GaStatCard
          title="Direct"
          value={s?.traffic?.Direct || 0}
          prevValue={prevStats.direct}
          sub={trends.direct}
          color="slate"
          loading={loading && !data}
        />
      </div>

      <div className="text-[11px] text-gray-500 font-semibold -mt-2">
        identity breakdown: anon {s?.uniqueAnonIds || 0} • session{" "}
        {s?.uniqueSessions || 0} • ip {s?.uniqueIps || 0}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card title="Traffic Distribution" headerExtras={<Globe className="w-4 h-4 text-sky-500" />}>
          <div className="py-2 space-y-1">
            <MixRow label="Google Ads" value={s?.traffic?.["Google Ads"] || 0} total={s?.uniqueVisitors || 1} color="amber" />
            <MixRow label="Search Partners" value={s?.traffic?.["Google Search Partners"] || 0} total={s?.uniqueVisitors || 1} color="indigo" />
            <MixRow label="Google Organic" value={s?.traffic?.["Google Organic"] || 0} total={s?.uniqueVisitors || 1} color="emerald" />
            <MixRow label="Facebook" value={s?.traffic?.Facebook || 0} total={s?.uniqueVisitors || 1} color="sky" />
            <MixRow label="Instagram" value={s?.traffic?.Instagram || 0} total={s?.uniqueVisitors || 1} color="pink" />
            <MixRow label="TikTok" value={s?.traffic?.TikTok || 0} total={s?.uniqueVisitors || 1} color="rose" />
            <MixRow label="Direct" value={s?.traffic?.Direct || 0} total={s?.uniqueVisitors || 1} color="slate" />
          </div>
        </Card>

        {/* 2. TOP CAMPAIGNS (Refined) */}
        <Card
          title="Ads Campaigns"
          headerExtras={<Megaphone className="w-4 h-4 text-amber-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.campaigns || []).map((c: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-3 hover:bg-amber-50/50 rounded-xl transition-colors border border-transparent hover:border-amber-100"
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-xs truncate">
                      {c.campaign}
                    </span>
                    {c.id && (
                      <a
                        href={`https://ads.google.com/aw/campaigns?campaignId=${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black hover:bg-amber-200 transition-colors"
                      >
                        ADS →
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                    {c.conversions} conversions detected
                  </span>
                </div>
                <GlossyBadge value={c.count} color="amber" />
              </div>
            ))}
            {!s?.campaigns?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No active ad campaigns detected
              </div>
            )}
          </div>
        </Card>

        {/* 3. TOP MODELS (Refined) */}
        <Card
          title="Top Models"
          headerExtras={
            <div className="flex items-center gap-2">
              <a
                href="/admin/cars"
                target="_blank"
                className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all flex items-center gap-1.5"
              >
                Cars Page
                <ExternalLink className="w-3 h-3" />
              </a>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
          }
        >
          <div className="p-4 space-y-2">
            {(s?.topModels || []).slice(0, 10).map((m: any, i: number) => (
              <div
                key={i}
                className="group flex items-center justify-between p-2.5 hover:bg-emerald-50/50 rounded-2xl transition-all border border-transparent hover:border-emerald-100/50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 group-hover:text-emerald-700 transition-colors truncate">
                      {m.key}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href={m.carId ? `/admin/cars/${m.carId}` : "/admin/cars"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold transition-all hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
                    title={m.carId ? "Edit Car" : "View All Cars"}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {m.carId ? "EDIT" : "VIEW"}
                  </a>
                  <GlossyBadge value={m.count} color="emerald" />
                </div>
              </div>
            ))}
            {!s?.topModels?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No model data available
              </div>
            )}
          </div>
        </Card>

        {/* 4. TOP PAGES (Refined) */}
        <Card
          title="Top Pages"
          headerExtras={
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
          }
        >
          <div className="p-4 space-y-2">
            {(s?.topPages || []).slice(0, 10).map((p: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-3 hover:bg-blue-50/50 rounded-xl transition-colors group border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`min-w-[24px] h-6 flex items-center justify-center text-[10px] font-black rounded-full shadow-sm ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col">
                    <a
                      href={`https://jrvservices.co${p.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors truncate block"
                      title={`View live: ${p.key}`}
                    >
                      {p.name || getPageName(p.key)}
                    </a>
                    {p.name !== p.key && p.name && (
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">
                        {p.key}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <GlossyBadge value={p.count} color="sky" />
                </div>
              </div>
            ))}
            {!s?.topPages?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No page data available
              </div>
            )}
          </div>
        </Card>

        <Card title="Event Actions" icon={Activity}>
          <div className="p-4 space-y-2">
            {(s?.events || []).filter((e: any) => e.count > 0).map((e: any, i: number) => {
              let color: any = "indigo";
              let Icon: any = Activity;
              const lower = e.key.toLowerCase();

              if (lower.includes("whatsapp")) { color = "emerald"; Icon = MessageCircle; }
              else if (lower.includes("phone") || lower.includes("call")) { color = "pink"; Icon = Smartphone; }
              else if (lower.includes("view")) { color = "sky"; Icon = Eye; }
              else if (lower.includes("click")) { color = "amber"; Icon = Zap; }

              return (
                <div
                  key={i}
                  className="group flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <span
                        className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${rankBadge(
                          i
                        )}`}
                      >
                        {i + 1}
                      </span>
                      <div className="absolute -top-1.5 -right-1.5 bg-white p-0.5 rounded-full border border-gray-100 shadow-xs">
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <span className="font-bold text-gray-700 truncate">{e.key}</span>
                  </div>
                  <GlossyBadge value={e.count} color={color} />
                </div>
              );
            })}
            {!s?.events?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No event data available
              </div>
            )}
          </div>
        </Card>

        {/* 5. TOP CITIES (Refined) */}
        <Card
          title="Top Cities (GPS)"
          headerExtras={<Globe className="w-4 h-4 text-emerald-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topCities || []).slice(0, 10).map((c: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-3 hover:bg-emerald-50/50 rounded-xl transition-colors border border-transparent hover:border-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-100" />
                  <span className="font-bold text-gray-700 truncate max-w-[180px]">{c.name || c.key}</span>
                </div>
                <GlossyBadge value={c.count || c.users} color="emerald" />
              </div>
            ))}
            {!s?.topCities?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No city data available
              </div>
            )}
          </div>
        </Card>

        {/* 6. TOP DEVICES (Refined) */}
        <Card
          title="Devices & ISPs"
          headerExtras={<Smartphone className="w-4 h-4 text-slate-500" />}
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Primary Devices</span>
              {(s?.devices || []).slice(0, 3).map((d: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <span className="font-bold text-gray-700 flex items-center gap-2">
                    <Smartphone className="w-3 h-3 text-slate-400" />
                    {d.key}
                  </span>
                  <span className="font-black text-slate-600 text-xs">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Top ISPs</span>
              {(s?.topISP || []).slice(0, 3).map((isp: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm p-2.5 bg-sky-50/30 rounded-xl border border-sky-100/50"
                >
                  <span className="font-bold text-gray-700 truncate max-w-[180px] flex items-center gap-2">
                    <Wifi className="w-3 h-3 text-sky-400" />
                    {isp.name}
                  </span>
                  <span className="font-black text-sky-700 text-xs">
                    {isp.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 7. TOP REFERRERS (Refined) */}
        <Card
          title="Traffic Referrers"
          headerExtras={<Link2 className="w-4 h-4 text-purple-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topReferrers || []).slice(0, 10).map((r: any, i: number) => {
              let color: any = "slate";
              let Icon: any = Globe;
              const lower = (r.name || r.key || "").toLowerCase();

              if (lower.includes("whatsapp")) { color = "emerald"; Icon = MessageCircle; }
              else if (lower.includes("instagram")) { color = "pink"; Icon = InstagramIcon; }
              else if (lower.includes("facebook")) { color = "sky"; Icon = FacebookIcon; }
              else if (lower.includes("google")) { color = "amber"; Icon = Search; }
              else if (lower.includes("tiktok")) { color = "rose"; Icon = Activity; }

              return (
                <div
                  key={i}
                  className="group flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <span
                        className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${rankBadge(
                          i
                        )}`}
                      >
                        {i + 1}
                      </span>
                      <div className="absolute -top-1.5 -right-1.5 bg-white p-0.5 rounded-full border border-gray-100 shadow-xs">
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <span className="font-bold text-gray-700 truncate">{r.name || r.key}</span>
                  </div>
                  <GlossyBadge value={r.count} color={color} />
                </div>
              );
            })}
            {!s?.topReferrers?.length && (
              <div className="text-gray-400 italic text-xs p-4 text-center">
                No referral data available
              </div>
            )}
          </div>
        </Card>
      </div >

      {/* 5. SESSION LOG (Refined) */}
      < Card
        title="Recent Visitor Sessions"
        headerExtras={< Users className="w-4 h-4 text-indigo-500" />}
      >
        <div className="overflow-auto max-h-[600px] border-t border-gray-100">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 border-b sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-black uppercase tracking-tight">Vistor Info</th>
                <th className="px-6 py-4 font-black uppercase tracking-tight">Source / Campaign</th>
                <th className="px-6 py-4 font-black uppercase tracking-tight">Activity Details</th>
                <th className="px-6 py-4 font-black uppercase tracking-tight text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(s?.sessions || []).map((sess: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-indigo-50/40 cursor-pointer group transition-all duration-200"
                  onClick={() => setSelectedSessionId(sess.id)}
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black shrink-0">
                        {sess.is_returning ? 'R' : 'N'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-gray-800 text-sm">
                          {new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {sess.location || 'Unknown'} • {sess.device}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-[10px] font-black uppercase w-fit px-2 py-0.5 rounded-md ${sess.traffic_type === 'paid' ? 'bg-purple-100 text-purple-700' :
                        sess.traffic_type === 'organic' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                        {sess.traffic_type}
                      </span>
                      <span className="text-gray-600 font-bold truncate max-w-[150px]">
                        {sess.campaign || 'Direct / None'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded-lg font-black text-[10px] border border-blue-100">
                          {sess.event_count} ACTIONS
                        </span>
                        {sess.is_returning && (
                          <span className="bg-amber-100/50 text-amber-700 px-2 py-0.5 rounded-lg font-black text-[10px] border border-amber-100">
                            RETURNING
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5 truncate max-w-[200px] uppercase tracking-tighter">
                        Entry: {sess.entry_page}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono font-black text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                        {sess.duration_seconds < 60 ? `${sess.duration_seconds}s` : `${Math.floor(sess.duration_seconds / 60)}m ${sess.duration_seconds % 60}s`}
                      </span>
                      <span className="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                        Details →
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {!s?.sessions?.length && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 font-bold text-sm uppercase tracking-widest italic">
                    No session data discovered
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card >

      {/* 5. PRECISE LOCATION LOG (Refined) */}
      < Card
        title="Live Exact Locations"
        headerExtras={< MapPin className="w-4 h-4 text-rose-500" />}
      >
        <div className="overflow-auto max-h-[500px] border-t border-gray-100">
          <table className="w-full text-xs text-left relative">
            <thead className="bg-gray-50/80 text-gray-500 border-b sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-black uppercase">Time</th>
                <th className="px-6 py-4 font-black uppercase">City / Region</th>
                <th className="px-6 py-4 font-black uppercase">Verified Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(s?.latestGps || []).map((g: any, i: number) => (
                <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-400">
                    {new Date(g.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-800">{g.parsed.city}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{g.parsed.region}</span>
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 text-gray-500 font-medium truncate max-w-xs"
                    title={g.exact_address}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      {g.exact_address}
                    </div>
                  </td>
                </tr>
              ))}
              {!s?.latestGps?.length && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest italic">
                    Awaiting GPS verified data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card >

      {/* SESSION DETAIL MODAL (Refined) */}
      {
        selectedSessionId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 scale-in-center animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-800">
                      Session Timeline
                    </h3>
                  </div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1 ml-11">
                    ID: {selectedSessionId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-rose-500 shadow-sm border border-transparent hover:border-rose-100 active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-8 bg-white">
                {loadingEvents ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                    <span className="text-sm font-black text-indigo-400 animate-pulse uppercase tracking-[0.2em]">Reconstructing events...</span>
                  </div>
                ) : (
                  <div className="space-y-8 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 top-2 bottom-2 w-1 bg-linear-to-b from-indigo-50 via-indigo-200 to-indigo-50 rounded-full" />

                    {sessionEvents.map((ev, i) => (
                      <div key={i} className="relative pl-12 group">
                        {/* Timeline Dot */}
                        <div className={`absolute left-1 top-2 w-7 h-7 rounded-2xl border-4 border-white shadow-md transition-all group-hover:scale-110 group-hover:rotate-12 z-10 flex items-center justify-center ${ev.event_name === 'page_view' ? 'bg-blue-500' :
                          ev.event_name === 'whatsapp_click' ? 'bg-emerald-500' :
                            ev.event_name === 'phone_click' ? 'bg-rose-500' :
                              ev.event_name === 'scroll' ? 'bg-amber-400' :
                                ev.event_name.toLowerCase().includes('events') ? 'bg-purple-500' :
                                  'bg-slate-500'
                          }`}>
                          {ev.event_name === 'page_view' && <Eye className="w-3 h-3 text-white" />}
                          {(ev.event_name === 'whatsapp_click' || ev.event_name.toLowerCase().includes('events')) && <Activity className="w-3 h-3 text-white" />}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-6 rounded-3xl bg-gray-50/50 hover:bg-white border border-transparent transition-all duration-300 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-black text-indigo-400 uppercase font-mono bg-indigo-50 px-2 py-0.5 rounded-md">
                                {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ev.event_name === 'whatsapp_click' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                ev.event_name === 'page_view' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                {ev.event_name}
                              </span>
                            </div>
                            <div className="text-base font-black text-gray-800 mb-3 truncate" title={ev.page_path || ev.page_url}>
                              {getPageName(ev.page_path || ev.page_url)}
                            </div>

                            {ev.props && Object.keys(ev.props).length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                {Object.entries(ev.props).map(([k, v]: [string, any]) => (
                                  <div key={k} className="flex flex-col bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm transition-transform hover:-translate-y-0.5">
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">{k}</span>
                                    <span className="text-[10px] font-bold text-gray-600 truncate">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 flex flex-col items-end gap-2 whitespace-nowrap pt-1">
                            {ev.ip && <span className="flex items-center gap-2 font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Globe className="w-3 h-3 text-gray-300" />{ev.ip}</span>}
                            {ev.device_type && <span className="flex items-center gap-2 font-bold uppercase tracking-tighter bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Smartphone className="w-3 h-3 text-gray-300" />{ev.device_type}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sessionEvents.length === 0 && (
                      <div className="text-center py-20 text-gray-300 font-black uppercase tracking-[0.3em] italic">Zero events captured.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{sessionEvents.length} Footprints Found</span>
                </div>
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="px-8 py-3 bg-gray-900 text-white text-xs font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 uppercase tracking-widest"
                >
                  Close Timeline
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
