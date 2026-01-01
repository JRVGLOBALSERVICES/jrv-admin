"use client";

import Link from "next/link";

type TopModel = { key: string; count: number };
type TopReferrer = { name: string; count: number };
type TopLoc = { name: string; count: number };

/* =========================
   Location Normalization & Aggregation
   ========================= */

const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  MY: "Malaysia",
  SG: "Singapore",
  US: "United States",
  UK: "United Kingdom",
  GB: "United Kingdom",
  ID: "Indonesia",
  IN: "India",
  AU: "Australia",
  CA: "Canada",
  CN: "China",
  HK: "Hong Kong",
  JP: "Japan",
  KR: "South Korea",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  TW: "Taiwan",
};

function decodeSafe(v: any) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, "%20")).trim();
  } catch {
    return raw;
  }
}

function normalizeCountry(input: any) {
  const s = decodeSafe(input);
  if (!s) return "";
  const upper = s.toUpperCase();
  if (COUNTRY_CODE_TO_NAME[upper]) return COUNTRY_CODE_TO_NAME[upper];
  if (upper === "MALAYSIA") return "Malaysia";
  if (upper === "SINGAPORE") return "Singapore";
  if (upper === "UNITED STATES" || upper === "USA") return "United States";
  if (upper === "UNITED KINGDOM" || upper === "GREAT BRITAIN")
    return "United Kingdom";
  return s;
}

function cleanPart(v: any) {
  const s = decodeSafe(v);
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

function normalizePackedLocation(name: any) {
  const decoded = decodeSafe(name);
  if (!decoded) return "";

  const parts = decoded
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  // Remove numeric "region code" like 14 from "... , 14, MY"
  if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 2])) {
    parts.splice(parts.length - 2, 1);
  }

  const city = cleanPart(parts[0] || "");
  let region = cleanPart(parts[1] || "");
  const country = normalizeCountry(parts[2] || "");

  if (region && /^\d+$/.test(region)) region = "";
  if (city && region && city.toLowerCase() === region.toLowerCase())
    region = "";
  if (!city && !region && country) return country;

  return [city, region, country].filter(Boolean).join(", ");
}

// ✅ Aggregation Function to Merge Duplicates
function aggregateAndSort(
  data: TopLoc[],
  mode: "country" | "packed"
): TopLoc[] {
  const map = new Map<string, number>();

  for (const item of data) {
    let label = item.name;
    // Normalize based on mode
    if (mode === "country") {
      label = normalizeCountry(item.name) || item.name;
    } else {
      label = normalizePackedLocation(item.name) || item.name;
    }

    // Capitalize properly for consistency (simple title case)
    // label = label.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

    // Store using the normalized label as key
    const current = map.get(label) || 0;
    map.set(label, current + item.count);
  }

  // Convert back to array
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // Sort desc
}

/* =========================
   UI Components
   ========================= */

// ✅ Vibrant Rank Badges
const RANK_BADGES = [
  "bg-indigo-500 text-white shadow-indigo-200",
  "bg-emerald-500 text-white shadow-emerald-200",
  "bg-amber-500 text-white shadow-amber-200",
  "bg-rose-500 text-white shadow-rose-200",
  "bg-sky-500 text-white shadow-sky-200",
  "bg-violet-500 text-white shadow-violet-200",
];

function rankBadge(i: number) {
  return RANK_BADGES[i % RANK_BADGES.length] + " shadow-md";
}

// ✅ Glossy KPI Card
function GlossyKpi({
  title,
  value,
  color = "blue",
}: {
  title: string;
  value: number;
  color?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo";
}) {
  const gradients = {
    blue: "from-cyan-500 to-blue-600 shadow-blue-200",
    green: "from-emerald-400 to-green-600 shadow-green-200",
    purple: "from-violet-400 to-purple-600 shadow-purple-200",
    orange: "from-amber-400 to-orange-600 shadow-orange-200",
    pink: "from-rose-400 to-red-600 shadow-rose-200",
    indigo: "from-indigo-400 to-blue-800 shadow-indigo-200",
  };

  const selectedGradient = gradients[color] || gradients.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg bg-linear-to-br ${selectedGradient} group hover:scale-[1.02] transition-transform duration-300`}
    >
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
          {title}
        </span>
        <div className="text-3xl font-black mt-2 tracking-tight drop-shadow-sm">
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ✅ Glossy Mix Bar
function MixRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "slate" | "emerald" | "amber" | "sky";
}) {
  const pct = Math.round((value / Math.max(1, total)) * 100);
  const gradients = {
    emerald: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    sky: "from-sky-400 to-blue-500",
    slate: "from-slate-400 to-slate-600",
  };

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
          className={`h-full rounded-full bg-linear-to-r ${gradients[color]} shadow-sm transition-all duration-500 relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30">
        <div className="font-bold text-gray-800 text-xs uppercase tracking-wide">
          {title}
        </div>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
   ========================= */

export default function MiniSiteAnalytics({
  activeUsers,
  whatsappClicks,
  phoneClicks,
  traffic,
  topModels,
  topReferrers,
  topCountries,
  topRegions,
  topCities,
}: {
  activeUsers: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: TopModel[];
  topReferrers: TopReferrer[];
  topCountries: TopLoc[];
  topRegions: TopLoc[];
  topCities: TopLoc[];
}) {
  const trafficTotal =
    (traffic.direct || 0) +
      (traffic.organic || 0) +
      (traffic.paid || 0) +
      (traffic.referral || 0) || 1;

  // ✅ Clean data before rendering
  const cleanCountries = aggregateAndSort(topCountries || [], "country");
  const cleanRegions = aggregateAndSort(topRegions || [], "packed");
  const cleanCities = aggregateAndSort(topCities || [], "packed");

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Website Analytics</h2>
          <p className="text-xs text-gray-500">Live snapshot (Last 24h)</p>
        </div>
        <Link
          href="/admin/site-events"
          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
        >
          Full Report →
        </Link>
      </div>

      {/* 2. KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlossyKpi title="Active Users" value={activeUsers} color="indigo" />
        <GlossyKpi title="WhatsApp" value={whatsappClicks} color="green" />
        <GlossyKpi title="Calls" value={phoneClicks} color="pink" />
        <GlossyKpi title="Organic" value={traffic.organic} color="green" />
        <GlossyKpi title="Direct" value={traffic.direct} color="orange" />
        <GlossyKpi title="Paid" value={traffic.paid} color="blue" />
      </div>

      {/* 3. Traffic & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Traffic Mix">
          <div className="space-y-4">
            <MixRow
              label="Direct"
              value={traffic.direct}
              total={trafficTotal}
              color="slate"
            />
            <MixRow
              label="Organic"
              value={traffic.organic}
              total={trafficTotal}
              color="emerald"
            />
            <MixRow
              label="Paid"
              value={traffic.paid}
              total={trafficTotal}
              color="amber"
            />
            <MixRow
              label="Referral"
              value={traffic.referral}
              total={trafficTotal}
              color="sky"
            />
          </div>
        </Card>

        <Card title="Top Models">
          <div className="space-y-3">
            {topModels.length ? (
              topModels.slice(0, 5).map((m, i) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between text-sm group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-700 group-hover:text-black truncate">
                      {m.key}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">{m.count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic">
                No model activity yet
              </div>
            )}
          </div>
        </Card>

        <Card title="Top Referrers">
          <div className="space-y-3">
            {topReferrers.length ? (
              topReferrers.slice(0, 5).map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between text-sm group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-700 group-hover:text-black truncate">
                      {r.name}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">{r.count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic">
                No referrers yet
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LocCard
          title="Top Countries"
          rows={cleanCountries}
          empty="No countries yet"
        />
        <LocCard
          title="Top Regions"
          rows={cleanRegions}
          empty="No regions yet"
        />
        <LocCard title="Top Cities" rows={cleanCities} empty="No cities yet" />
      </div>
    </div>
  );
}

function LocCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { name: string; count: number }[];
  empty: string;
}) {
  return (
    <Card title={title}>
      <div className="space-y-3">
        {rows?.length ? (
          rows.slice(0, 5).map((r, i) => {
            return (
              <div
                key={`${title}-${r.name}-${i}`}
                className="flex items-center justify-between text-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-700 group-hover:text-black truncate max-w-40">
                    {r.name}
                  </span>
                </div>
                <span className="font-bold text-gray-900">{r.count}</span>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-gray-400 italic">{empty}</div>
        )}
      </div>
    </Card>
  );
}
