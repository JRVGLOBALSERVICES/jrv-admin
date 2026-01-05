"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, MapPin, Globe, Activity } from "lucide-react";

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
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-linear-to-br ${gradients[color]} group hover:scale-[1.02] transition-transform duration-300`}
    >
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">
          {title}
        </span>
        <div className="text-4xl font-black mt-3 tracking-tight drop-shadow-sm">
          {value ? value.toLocaleString() : 0}
        </div>
      </div>
    </div>
  );
}

function rankBadge(i: number) {
  const BADGES = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
  ];
  return `${BADGES[i % BADGES.length]} text-white shadow-md`;
}

export default function SiteEventsClient({ initialFrom, initialTo }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ from: initialFrom, to: initialTo });
        const res = await fetch(`/api/admin/site-events/summary?${qs}`);
        const json = await res.json();
        if (json.ok) setData(json);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [initialFrom, initialTo]);

  const s = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. KEY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlossyKpi title="Page Views" value={s?.pageViews} color="blue" />
        <GlossyKpi title="WhatsApp" value={s?.whatsappClicks} color="green" />
        <GlossyKpi title="Paid" value={s?.traffic?.paid} color="orange" />
        <GlossyKpi title="Organic" value={s?.traffic?.organic} color="green" />
        <GlossyKpi title="Direct" value={s?.traffic?.direct} color="purple" />
        <GlossyKpi
          title="Referral"
          value={s?.traffic?.referral}
          color="indigo"
        />
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

        {/* 4. TOP CITIES (New Breakdown) */}
        <Card
          title="Top Cities (GPS)"
          headerExtras={<Globe className="w-4 h-4 text-emerald-500" />}
        >
          <div className="p-4 space-y-2">
            {(s?.topCities || []).slice(0, 8).map((c: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 hover:bg-emerald-50 rounded"
              >
                <span className="font-medium text-gray-700">{c.key}</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. PRECISE LOCATION LOG */}
      <Card
        title="Recent Exact Locations"
        headerExtras={<MapPin className="w-4 h-4 text-rose-500" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Region</th>
                <th className="px-4 py-2">Exact Address</th>
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
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
