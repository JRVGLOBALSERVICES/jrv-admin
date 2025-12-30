"use client";

import Link from "next/link";

type TopModel = { key: string; count: number };
type TopReferrer = { name: string; count: number };
type TopLocation = { name: string; count: number };

export default function MiniSiteAnalytics({
  activeUsers,
  whatsappClicks,
  phoneClicks,
  traffic,
  topModels,
  topReferrers,
  topCountries = [],
  topRegions = [],
  topCities = [],
}: {
  activeUsers: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: TopModel[];
  topReferrers: TopReferrer[];
  topCountries?: TopLocation[];
  topRegions?: TopLocation[];
  topCities?: TopLocation[];
}) {
  const showLocations = (topCountries?.length || 0) + (topRegions?.length || 0) + (topCities?.length || 0) > 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">Website Analytics (Last 24h)</div>
          <div className="text-xs text-gray-500">Mini view • Click “View details” for full GA-style page</div>
        </div>

        <Link
          href="/admin/site-events"
          className="text-xs font-semibold px-3 py-2 rounded border bg-white hover:bg-gray-50"
        >
          View details →
        </Link>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi title="Active Users (24h)" value={activeUsers} tone="indigo" />
        <Kpi title="WhatsApp CLICKS" value={whatsappClicks} tone="emerald" />
        <Kpi title="Call Clicks" value={phoneClicks} tone="rose" />
        <Kpi title="Organic Events" value={traffic.organic} tone="emerald" />
        <Kpi title="Direct Events" value={traffic.direct} tone="amber" />
        <Kpi title="Paid Events" value={traffic.paid} tone="sky" />
      </div>

      <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-600 mb-2">Traffic Mix</div>
          <div className="flex flex-wrap gap-2">
            <Pill label={`Direct ${traffic.direct}`} />
            <Pill label={`Organic ${traffic.organic}`} />
            <Pill label={`Paid ${traffic.paid}`} />
            <Pill label={`Referral ${traffic.referral}`} />
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">Top Models (all car activity)</div>
          <div className="space-y-2">
            {topModels.length ? (
              topModels.slice(0, 5).map((m, i) => (
                <RowLine key={m.key} index={i} name={m.key || "Unknown"} count={m.count} />
              ))
            ) : (
              <div className="text-sm text-gray-400">No model activity yet</div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">Top Referrers</div>
          <div className="space-y-2">
            {topReferrers.length ? (
              topReferrers.slice(0, 5).map((r, i) => (
                <RowLine key={`${r.name}-${i}`} index={i} name={r.name || "Direct / None"} count={r.count} />
              ))
            ) : (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">Top Locations</div>

          {!showLocations ? (
            <div className="text-sm text-gray-400">
              No geo data yet (country/region/city empty on events)
            </div>
          ) : (
            <div className="space-y-3">
              <LocationBlock title="Countries" rows={topCountries} />
              <LocationBlock title="Regions" rows={topRegions} />
              <LocationBlock title="Cities" rows={topCities} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationBlock({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  const list = (rows || []).slice(0, 3);
  if (!list.length) return null;

  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-500 mb-1">{title}</div>
      <div className="space-y-1">
        {list.map((r, i) => (
          <div key={`${title}-${r.name}-${i}`} className="flex items-center justify-between text-sm">
            <div className="truncate pr-2 font-semibold text-gray-900">{r.name || "Unknown"}</div>
            <div className="font-bold text-gray-800 tabular-nums">{r.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowLine({ index, name, count }: { index: number; name: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <span className="font-semibold text-gray-900 truncate">{name}</span>
      </div>
      <span className="font-bold text-gray-800 tabular-nums">{count}</span>
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
      <div className="text-xl font-black mt-1 tabular-nums">{value}</div>
    </div>
  );
}
