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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import GlossyKpi from "./GlossyKpi";
import { rankBadge } from "../_lib/utils";

/* =========================
   Types
   ========================= */
type TopItem = { key: string; count: number };
type TopLoc = { name: string; users: number; status?: string; trend?: string };

/* =========================
   UI Components
   ========================= */

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
        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
          {label}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          <span className="font-bold text-gray-900">{value}</span> ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100/80 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full bg-linear-to-r ${chosenGradient} shadow-sm transition-all duration-500 relative overflow-hidden`}
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
}: {
  title: string;
  children: any;
  icon?: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
        <div className="font-bold text-gray-800 text-xs uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3 text-gray-400" />}
          {title}
        </div>
      </div>
      <div className="p-4 flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}

function ListRow({
  rank,
  label,
  count,
}: {
  rank: number;
  label: string;
  count: number | string;
}) {
  return (
    <div className="flex items-center justify-between text-sm group py-1">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rankBadge(
            rank
          )}`}
        >
          {rank + 1}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-gray-700 group-hover:text-black truncate max-w-[160px]">
            {label}
          </div>
        </div>
      </div>
      <span className="font-bold text-gray-900 shrink-0">{count}</span>
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
    topModels: { key: string; count: number }[];
    topPages: { key: string; count: number }[]; // Added
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

        <Card title="Top Models">
          <div className="space-y-3">
            {topModels.length ? (
              topModels
                .slice(0, 5)
                .map((m, i) => (
                  <ListRow key={m.key} rank={i} label={m.key} count={m.count} />
                ))
            ) : (
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No model data
              </div>
            )}
          </div>
        </Card>

        <Card title="Top Referrers" icon={Globe}>
          <div className="space-y-3">
            {topReferrers.length ? (
              topReferrers
                .slice(0, 5)
                .map((r, i) => (
                  <ListRow
                    key={r.name}
                    rank={i}
                    label={r.name}
                    count={r.count}
                  />
                ))
            ) : (
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No referrers
              </div>
            )}
          </div>
        </Card>

        <Card title="Top Locations" icon={MapPin}>
          <div className="space-y-3">
            {topLocations?.length ? (
              topLocations.slice(0, 6).map((loc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm group py-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-700 truncate">
                        {loc.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">
                      {loc.users}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-gray-400">
                      Users
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic py-4 text-center">
                No location data
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
