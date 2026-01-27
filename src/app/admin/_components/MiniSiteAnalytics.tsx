"use client";

import Link from "next/link";
import {
  Activity,
  MapPin,
  Globe,
  Wifi,
  Users,
  RefreshCw,
  ChevronRight,
  Fingerprint,
  ExternalLink,
  MessageCircle,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  Search,
  Zap,
  Car,
  Phone,
  Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import GlossyKpi from "./GlossyKpi";
import { rankBadge } from "../_lib/utils";

/* =========================
   Types
   ========================= */
type TopItem = { key: string; count: number; carId?: string };
type TopLoc = { name: string; users: number; status?: string; trend?: string };

/* =========================
   UI Components
   ========================= */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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

function MixRow({
  label,
  value,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  total: number;
  color: "slate" | "emerald" | "amber" | "sky" | "pink" | "indigo" | "rose";
  icon?: any;
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
    <div className="group px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between text-xs text-gray-700 mb-1.5">
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon className={`w-3.5 h-3.5 text-gray-600`} />
          ) : (
            <div
              className={`w-1.5 h-1.5 rounded-full bg-linear-to-br ${chosenGradient} shadow-xs ring-2 ring-white`}
            />
          )}
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-gray-700">
          <span className="font-bold text-gray-900">{value}</span> ({pct}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden shadow-inner">
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

function Card({
  title,
  children,
  icon: Icon,
  headerExtras,
}: {
  title: string;
  children: any;
  icon?: any;
  headerExtras?: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-xl bg-white overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-indigo-100 bg-linear-to-r from-indigo-50 via-blue-50 to-white flex items-center justify-between">
        <div className="font-black text-indigo-900 text-sm uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-indigo-400" />}
          {title}
        </div>
        {headerExtras && <div>{headerExtras}</div>}
      </div>
      <div className="p-0 flex-1 overflow-y-auto max-h-[440px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {children}
      </div>
    </div>
  );
}

function ListRow({
  rank,
  label,
  count,
  color = "slate",
  icon: CustomIcon
}: {
  rank: number;
  label: string;
  count: number | string;
  color?: "emerald" | "amber" | "sky" | "pink" | "indigo" | "rose" | "slate";
  icon?: any;
}) {
  return (
    <div className="flex items-center justify-between text-sm group py-1.5 transition-all hover:translate-x-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border ${rankBadge(
              rank
            )}`}
          >
            {rank + 1}
          </span>
          {CustomIcon && (
            <div className="absolute -top-1.5 -right-1.5 bg-white p-0.5 rounded-full border border-gray-100 shadow-xs">
              <CustomIcon className="w-2.5 h-2.5" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-gray-700 group-hover:text-indigo-600 truncate max-w-[160px] transition-colors">
            {label}
          </div>
        </div>
      </div>
      <GlossyBadge value={count} color={color} />
    </div>
  );
}

export default function MiniSiteAnalytics({
  initialData,
  dateRange,
  filters = {},
}: {
  initialData: {
    activeUsersRealtime: number;
    uniqueVisitors24h: number;
    uniqueAnonIds24h: number;
    uniqueSessions24h: number;
    uniqueIps24h: number;
    whatsappClicks: number;
    phoneClicks: number;
    traffic: {
      "Google Ads": number;
      "Google Search Partners": number;
      "Google Organic": number;
      Facebook: number;
      Instagram: number;
      TikTok: number;
      Direct: number;
    };
    topModels: { key: string; count: number; carId?: string }[];
    topPages: {
      key: string;
      name: string;
      count: number;
      carId?: string | null;
    }[];
    topReferrers: { key: string; name?: string; count: number }[];
    topISP: { key: string; name?: string; count: number }[];
    topLocations: (TopLoc & { key: string })[];
    topCities?: { key: string; count: number }[];
    topRegions?: { key: string; count: number }[];
  };
  dateRange: { from: string; to: string };
  filters?: { model?: string; plate?: string };
}) {
  const [data, setData] = useState(initialData);
  const [countdown, setCountdown] = useState(15);
  const [isNewUserEntry, setIsNewUserEntry] = useState(false);
  const [trend, setTrend] = useState<"up" | "down">("up");
  const prevUserCount = useRef(initialData.activeUsersRealtime);

  // Polling
  useEffect(() => {
    const poll = async () => {
      try {
        const params: any = {
          from: dateRange.from,
          to: dateRange.to,
        };
        if (filters?.model) params.model = filters.model;
        if (filters?.plate) params.plate = filters.plate;

        const qs = new URLSearchParams(params);
        const res = await fetch(`/api/admin/site-events/summary?${qs}`);
        const json = await res.json();
        if (json.ok) {
          setData((prev) => ({
            ...prev,
            activeUsersRealtime: json.activeUsers,
            uniqueVisitors24h: json.uniqueVisitors,
            uniqueAnonIds24h: json.uniqueAnonIds,
            uniqueSessions24h: json.uniqueSessions,
            uniqueIps24h: json.uniqueIps,
            whatsappClicks: json.whatsappClicks,
            phoneClicks: json.phoneClicks,
            traffic: json.traffic,
            topModels: json.topModels,
            topPages: json.topPages,
            topReferrers: json.topReferrers,
            topISP: json.topISP,
            topLocations: json.topLocations,
            topCities: json.topCities,
            topRegions: json.topRegions,
          }));
          setCountdown(15);
        }
      } catch (e) {
        console.error("Poll failed", e);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [dateRange, filters]);

  // Pulse Effect
  useEffect(() => {
    if (data.activeUsersRealtime !== prevUserCount.current) {
      if (data.activeUsersRealtime > prevUserCount.current) setTrend("up");
      else if (data.activeUsersRealtime < prevUserCount.current) setTrend("down");

      setIsNewUserEntry(true);
      const timeout = setTimeout(() => setIsNewUserEntry(false), 14000);
      prevUserCount.current = data.activeUsersRealtime;
      return () => clearTimeout(timeout);
    }
    prevUserCount.current = data.activeUsersRealtime;
  }, [data.activeUsersRealtime]);

  // Countdown Timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const {
    activeUsersRealtime,
    uniqueVisitors24h,
    uniqueAnonIds24h,
    uniqueSessions24h,
    uniqueIps24h,
    whatsappClicks,
    phoneClicks,
    traffic,
    topModels,
    topPages,
    topReferrers,
    topISP,
    topLocations,
    topCities,
    topRegions,
  } = data;

  const trafficTotal = Object.values(traffic).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Website Analytics
        </h2>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
              Live Auto-Sync
            </span>
            <div className="w-px h-3 bg-emerald-200 mx-1"></div>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
              <RefreshCw
                className={`w-3 h-3 ${countdown === 5 ? "animate-spin" : ""}`}
              />
              {countdown}s
            </div>
          </div>

          <Link
            href="/admin/site-events"
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
          >
            Full Report
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <GlossyKpi
          title="Active Users (5M)"
          value={activeUsersRealtime}
          color={isNewUserEntry ? (trend === "up" ? "emerald" : "rose") : "indigo"}
          icon={Users}
          pulse={isNewUserEntry}
          trend={trend}
        />
        <div className="flex flex-col gap-1">
          <GlossyKpi
            title="Unique Visitors"
            value={uniqueVisitors24h}
            color="orange"
            icon={Fingerprint}
          />
          {/* <div className="text-[10px] font-black text-gray-500 px-1">
            anon:{uniqueAnonIds24h} • sess:{uniqueSessions24h} • ip:
            {uniqueIps24h}
          </div> */}
        </div>
        <GlossyKpi
          title="Google Ads"
          value={traffic["Google Ads"]}
          color="blue"
          icon={Megaphone}
        />
        <GlossyKpi
          title="Google Organic"
          value={traffic["Google Organic"]}
          color="green"
          icon={Search}
        />
        <GlossyKpi
          title="Direct Traffic"
          value={traffic["Direct"]}
          color="slate"
          icon={Car}
        />
        <GlossyKpi
          title="WhatsApp"
          value={whatsappClicks}
          color="green"
          icon={WhatsAppIcon}
        />
        <GlossyKpi title="Calls" value={phoneClicks} color="pink" icon={Phone} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card title="Traffic Breakdown">
          <div className="space-y-4">
            <MixRow
              label="Google Ads"
              value={traffic["Google Ads"]}
              total={trafficTotal}
              color="amber"
              icon={Megaphone}
            />
            <MixRow
              label="Search Partners"
              value={traffic["Google Search Partners"]}
              total={trafficTotal}
              color="indigo"
              icon={Search}
            />
            <MixRow
              label="Google Organic"
              value={traffic["Google Organic"]}
              total={trafficTotal}
              color="emerald"
              icon={Search}
            />
            <MixRow
              label="Facebook"
              value={traffic["Facebook"]}
              total={trafficTotal}
              color="sky"
              icon={FacebookIcon}
            />
            <MixRow
              label="Instagram"
              value={traffic["Instagram"]}
              total={trafficTotal}
              color="pink"
              icon={InstagramIcon}
            />
            <MixRow
              label="TikTok"
              value={traffic["TikTok"]}
              total={trafficTotal}
              color="rose"
              icon={Zap}
            />
            <MixRow
              label="Direct"
              value={traffic["Direct"]}
              total={trafficTotal}
              color="slate"
              icon={Car}
            />
          </div>
        </Card>

        <Card title="Top Models" icon={Zap}>
          <div className="space-y-1 px-5 py-4">
            {topModels?.length ? (
              topModels.slice(0, 10).map((m, i) => (
                <div key={m.key} className="group relative">
                  <ListRow
                    rank={i}
                    label={m.key}
                    count={m.count}
                    color={i === 0 ? "emerald" : "indigo"}
                  />
                  <div className="absolute right-12 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={m.carId ? `/admin/cars/${m.carId}` : "/admin/cars"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                    >
                      EDIT
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-600 italic py-4 text-center">
                No model data
              </div>
            )}
          </div>
        </Card>

        <Card title="Referrers" icon={Globe}>
          <div className="space-y-1 px-5 py-4">
            {topReferrers?.length ? (
              topReferrers.slice(0, 10).map((r, i) => {
                let color: any = "slate";
                let Icon: any = Globe;
                const label = r.name || r.key || "";
                const lower = label.toLowerCase();

                if (lower.includes("whatsapp")) { color = "emerald"; Icon = WhatsAppIcon; }
                else if (lower.includes("instagram")) { color = "pink"; Icon = InstagramIcon; }
                else if (lower.includes("facebook")) { color = "sky"; Icon = FacebookIcon; }
                else if (lower.includes("google")) { color = "amber"; Icon = Search; }
                else if (lower.includes("tiktok")) { color = "rose"; Icon = Activity; }

                return (
                  <ListRow
                    key={r.key || r.name}
                    rank={i}
                    label={r.name || r.key}
                    count={r.count}
                    color={color}
                    icon={Icon}
                  />
                );
              })
            ) : (
              <div className="text-xs text-gray-600 italic py-4 text-center">
                No referrers
              </div>
            )}
          </div>
        </Card>

        <Card title="Top Pages" icon={Activity}>
          <div className="space-y-1 px-5 py-4">
            {topPages?.length ? (
              topPages.slice(0, 10).map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm group py-1 border-b border-gray-50 last:border-0 pb-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <a
                        href={`https://jrvservices.co${p.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-700 truncate max-w-[120px] block hover:text-blue-600 transition-colors"
                        title={`View live: ${p.key}`}
                      >
                        {p.name}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-gray-900">{p.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-600 italic py-4 text-center">
                No page data
              </div>
            )}
          </div>
        </Card>

        {/* New Location Cards */}
        <Card title="Top Regions" icon={MapPin}>
          <div className="space-y-1 px-5 py-4">
            {topRegions?.length ? (
              topRegions.slice(0, 20).map((r, i) => (
                <ListRow
                  key={r.key}
                  rank={i}
                  label={r.key}
                  count={r.count}
                  color="indigo"
                />
              ))
            ) : (
              <div className="text-xs text-gray-600 italic py-4 text-center">
                No region data
              </div>
            )}
          </div>
        </Card>

        <Card title="Top Cities" icon={MapPin}>
          <div className="space-y-1 px-5 py-4">
            {topCities?.length ? (
              topCities.slice(0, 20).map((c, i) => (
                <ListRow
                  key={c.key}
                  rank={i}
                  label={c.key}
                  count={c.count}
                  color="emerald"
                />
              ))
            ) : (
              <div className="text-xs text-gray-600 italic py-4 text-center">
                No city data
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
