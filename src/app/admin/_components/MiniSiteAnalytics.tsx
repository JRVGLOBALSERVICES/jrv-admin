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
    <div className="group">
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
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
        <div className="font-bold text-gray-800 text-xs uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3 text-gray-400" />}
          {title}
        </div>
        {headerExtras && <div>{headerExtras}</div>}
      </div>
      <div className="p-4 flex-1 overflow-x-auto">{children}</div>
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
  data,
}: {
  data: {
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
    topPages: { key: string; name: string; count: number; carId?: string | null }[];
    topReferrers: { name: string; count: number }[];
    topISP: { name: string; count: number }[];
    topLocations: TopLoc[];
  };
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(30);
  const [isNewUserEntry, setIsNewUserEntry] = useState(false);
  const prevUserCount = useRef(data.activeUsersRealtime);

  useEffect(() => {
    if (data.activeUsersRealtime > prevUserCount.current) {
      setIsNewUserEntry(true);
      const timeout = setTimeout(() => setIsNewUserEntry(false), 4000);
      prevUserCount.current = data.activeUsersRealtime;
      return () => clearTimeout(timeout);
    }
    prevUserCount.current = data.activeUsersRealtime;
  }, [data.activeUsersRealtime]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      router.refresh();
      setCountdown(30);
    }, 30000);

    const timerInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(timerInterval);
    };
  }, [router]);

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
    topPages, // Added
    topReferrers,
    topISP,
    topLocations,
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
          title="Active Users"
          value={activeUsersRealtime}
          color={isNewUserEntry ? "emerald" : "indigo"}
          icon={Users}
          pulse={isNewUserEntry}
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
        />
        <GlossyKpi
          title="Google Organic"
          value={traffic["Google Organic"]}
          color="green"
        />
        <GlossyKpi
          title="Direct Traffic"
          value={traffic["Direct"]}
          color="slate"
        />
        <GlossyKpi title="WhatsApp" value={whatsappClicks} color="green" />
        <GlossyKpi title="Calls" value={phoneClicks} color="pink" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Traffic Breakdown">
          <div className="space-y-4">
            <MixRow
              label="Google Ads"
              value={traffic["Google Ads"]}
              total={trafficTotal}
              color="amber"
            />
            <MixRow
              label="Search Partners"
              value={traffic["Google Search Partners"]}
              total={trafficTotal}
              color="indigo"
            />
            <MixRow
              label="Google Organic"
              value={traffic["Google Organic"]}
              total={trafficTotal}
              color="emerald"
            />
            <MixRow
              label="Facebook"
              value={traffic["Facebook"]}
              total={trafficTotal}
              color="sky"
            />
            <MixRow
              label="Instagram"
              value={traffic["Instagram"]}
              total={trafficTotal}
              color="pink"
            />
            <MixRow
              label="TikTok"
              value={traffic["TikTok"]}
              total={trafficTotal}
              color="rose"
            />
            <MixRow
              label="Direct"
              value={traffic["Direct"]}
              total={trafficTotal}
              color="slate"
            />
          </div>
        </Card>

        <Card title="Top Models" icon={Zap}>
          <div className="space-y-1">
            {topModels?.length ? (
              topModels.slice(0, 5).map((m, i) => (
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
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No model data
              </div>
            )}
          </div>
        </Card>

        <Card title="Referrers" icon={Globe}>
          <div className="space-y-1">
            {topReferrers?.length ? (
              topReferrers.slice(0, 5).map((r, i) => {
                let color: any = "slate";
                let Icon: any = Globe;
                const lower = r.name.toLowerCase();

                if (lower.includes("whatsapp")) { color = "emerald"; Icon = MessageCircle; }
                else if (lower.includes("instagram")) { color = "pink"; Icon = InstagramIcon; }
                else if (lower.includes("facebook")) { color = "sky"; Icon = FacebookIcon; }
                else if (lower.includes("google")) { color = "amber"; Icon = Search; }
                else if (lower.includes("tiktok")) { color = "rose"; Icon = Activity; }

                return (
                  <ListRow
                    key={r.name}
                    rank={i}
                    label={r.name}
                    count={r.count}
                    color={color}
                    icon={Icon}
                  />
                );
              })
            ) : (
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No referrers
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Top Pages"
          icon={Activity}
        // headerExtras={
        //   <Link
        //     href="/admin/cars"
        //     className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50"
        //   >
        //     Cars Page →
        //   </Link>
        // }
        >
          <div className="space-y-3">
            {topPages?.length ? (
              topPages.slice(0, 6).map((p, i) => (
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
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No page data
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
