"use client";

import Link from "next/link";

type TopModel = { key: string; count: number };
type TopReferrer = { name: string; count: number };
type TopLoc = { name: string; count: number };

/* =========================
   Location normalization
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

/**
 * Turns these into a clean label:
 * - "Santa%20Clara, CA, US" -> "Santa Clara, CA, United States"
 * - "Kuala%20Lumpur, 14, MY" -> "Kuala Lumpur, Malaysia"
 * - Prevents: "Kuala Lumpur, Kuala Lumpur, MY" duplication
 */
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

  // If region is numeric leftover, drop it
  if (region && /^\d+$/.test(region)) region = "";

  // Prevent duplication: city === region
  if (city && region && city.toLowerCase() === region.toLowerCase()) {
    region = "";
  }

  // If it's just "MY" etc, normalize
  if (!city && !region && country) return country;

  return [city, region, country].filter(Boolean).join(", ");
}

/* =========================
   UI colors
   ========================= */

const RANK_BADGES = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-violet-50 text-violet-700 border-violet-200",
];

function rankBadge(i: number) {
  return RANK_BADGES[i % RANK_BADGES.length];
}

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
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">
            Website Analytics (8am→8am)
          </div>
          <div className="text-xs text-gray-500">
            Mini view • Click “View details” for full GA-style page
          </div>
        </div>

        <Link
          href="/admin/site-events"
          className="text-xs font-semibold px-3 py-2 rounded border bg-white hover:bg-gray-50"
        >
          View details →
        </Link>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi title="Active Users (5m)" value={activeUsers} tone="indigo" />
        <Kpi title="WhatsApp Clicks" value={whatsappClicks} tone="emerald" />
        <Kpi title="Call Clicks" value={phoneClicks} tone="rose" />
        <Kpi title="Organic" value={traffic.organic} tone="emerald" />
        <Kpi title="Direct" value={traffic.direct} tone="amber" />
        <Kpi title="Paid" value={traffic.paid} tone="sky" />
      </div>

      <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Traffic Mix
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill label={`Direct ${traffic.direct}`} />
            <Pill label={`Organic ${traffic.organic}`} />
            <Pill label={`Paid ${traffic.paid}`} />
            <Pill label={`Referral ${traffic.referral}`} />
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Top Models
          </div>
          <div className="space-y-2">
            {topModels.length ? (
              topModels.slice(0, 5).map((m, i) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">
                      {m.key}
                    </span>
                  </div>
                  <span className="font-black text-gray-900">{m.count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">No model activity yet</div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Top Referrers
          </div>
          <div className="space-y-2">
            {topReferrers.length ? (
              topReferrers.slice(0, 5).map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black ${rankBadge(
                        i
                      )}`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">
                      {r.name}
                    </span>
                  </div>
                  <span className="font-black text-gray-900">{r.count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LocCard
          title="Top Countries"
          rows={topCountries}
          empty="No resolved countries yet"
          mode="country"
        />
        <LocCard
          title="Top Regions"
          rows={topRegions}
          empty="No resolved regions yet"
          mode="packed"
        />
        <LocCard
          title="Top Cities"
          rows={topCities}
          empty="No resolved cities yet"
          mode="packed"
        />
      </div>
    </div>
  );
}

function LocCard({
  title,
  rows,
  empty,
  mode,
}: {
  title: string;
  rows: { name: string; count: number }[];
  empty: string;
  mode: "country" | "packed";
}) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-xs font-semibold text-gray-600 mb-2">{title}</div>
      <div className="space-y-2">
        {rows?.length ? (
          rows.slice(0, 5).map((r, i) => {
            const label =
              mode === "country"
                ? normalizeCountry(r.name) || r.name
                : normalizePackedLocation(r.name) || r.name;

            return (
              <div
                key={`${title}-${r.name}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black ${rankBadge(
                      i
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900 truncate">
                    {label}
                  </span>
                </div>
                <span className="font-black text-gray-900">{r.count}</span>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-400">{empty}</div>
        )}
      </div>
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
      <div className="text-[11px] font-semibold uppercase opacity-80">
        {title}
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}
