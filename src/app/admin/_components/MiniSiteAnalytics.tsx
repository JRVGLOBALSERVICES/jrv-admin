import Link from "next/link";

type TopModel = { key: string; count: number };

// NOTE: in your newer code you use { name, count } for referrers.
// This component supports BOTH { key } and { name } to avoid breaking changes.
type TopReferrer = { key?: string; name?: string; count: number };

type TopCampaign = {
  campaign: string; // e.g. "utm:deepavali" or "gad:23410586632" or "—"
  count: number;
  views: number;
  whatsapp: number;
  calls: number;
  conversions: number;
  rate: number; // whatsapp/views
};

export default function MiniSiteAnalytics({
  activeUsers,
  whatsappClicks,
  phoneClicks,
  traffic,
  topModels,
  topReferrers,
  campaigns = [],
}: {
  activeUsers: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: TopModel[];
  topReferrers: TopReferrer[];
  campaigns?: TopCampaign[];
}) {
  const topRef =
    topReferrers?.map((r) => ({
      label: (r.name || r.key || "—").toString(),
      count: r.count || 0,
    })) || [];

  const googleAdsCount =
    topRef.find((x) => x.label === "Google Ads")?.count || 0;
  const googleOrgCount =
    topRef.find((x) => x.label === "Google (Organic)")?.count || 0;

  const topCampaigns = (campaigns || [])
    .filter((c) => c?.campaign && c.campaign !== "—")
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-linear-to-r from-gray-50 to-white flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">
            Website Analytics (Last 24h)
          </div>
          <div className="text-xs text-gray-500">
            Mini view • Click “View details” for sessions, campaigns & funnels
          </div>
        </div>

        <Link
          href="/admin/site-events"
          className="text-xs font-semibold px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
        >
          View details →
        </Link>
      </div>

      {/* KPIs */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-8 gap-3">
        <Kpi title="Active Users" value={activeUsers} tone="indigo" />
        <Kpi title="WhatsApp" value={whatsappClicks} tone="emerald" />
        <Kpi title="Calls" value={phoneClicks} tone="rose" />

        <Kpi title="Google Ads" value={googleAdsCount} tone="violet" />
        <Kpi title="Google Organic" value={googleOrgCount} tone="emerald" />

        <Kpi title="Paid" value={traffic.paid} tone="amber" />
        <Kpi title="Organic" value={traffic.organic} tone="green" />
        <Kpi title="Direct" value={traffic.direct} tone="sky" />
      </div>

      <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Traffic Mix */}
        <div className="border rounded-xl p-3 bg-linear-to-br from-gray-50 to-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Traffic Mix
          </div>

          {/* mini bars */}
          <MiniBars
            items={[
              { label: "Direct", value: traffic.direct, tone: "sky" },
              { label: "Organic", value: traffic.organic, tone: "green" },
              { label: "Paid", value: traffic.paid, tone: "amber" },
              { label: "Referral", value: traffic.referral, tone: "indigo" },
            ]}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            <Pill label={`Direct ${traffic.direct}`} />
            <Pill label={`Organic ${traffic.organic}`} />
            <Pill label={`Paid ${traffic.paid}`} />
            <Pill label={`Referral ${traffic.referral}`} />
          </div>

          <div className="text-[11px] text-gray-500 mt-2">
            Paid includes gclid/gbraid/wbraid/gad_campaignid detection.
          </div>
        </div>

        {/* Top Models */}
        <div className="border rounded-xl p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Top Models
          </div>
          <div className="space-y-2">
            {topModels?.length ? (
              topModels
                .slice(0, 5)
                .map((m, i) => (
                  <RowRank
                    key={m.key}
                    idx={i}
                    label={m.key}
                    value={m.count}
                    badgeTone="emerald"
                  />
                ))
            ) : (
              <div className="text-sm text-gray-400">No model activity yet</div>
            )}
          </div>
        </div>

        {/* Top Referrers (Google split) */}
        <div className="border rounded-xl p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Top Referrers (Google split)
          </div>
          <div className="space-y-2">
            {topRef?.length ? (
              topRef
                .slice(0, 5)
                .map((r, i) => (
                  <RowRank
                    key={`${r.label}-${i}`}
                    idx={i}
                    label={r.label}
                    value={r.count}
                    badgeTone={r.label === "Google Ads" ? "violet" : "indigo"}
                  />
                ))
            ) : (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="border rounded-xl p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Top Campaigns
          </div>
          <div className="space-y-2">
            {topCampaigns.length ? (
              topCampaigns.map((c, i) => (
                <div
                  key={`${c.campaign}-${i}`}
                  className="border rounded-lg p-2 bg-linear-to-br from-amber-50 to-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {prettyCampaign(c.campaign)}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Views <b>{c.views}</b> • WA <b>{c.whatsapp}</b> • Calls{" "}
                        <b>{c.calls}</b>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-700">
                        {c.conversions}
                      </div>
                      <div className="text-[11px] text-gray-500">conv</div>
                    </div>
                  </div>

                  {/* progress */}
                  <div className="mt-2">
                    <ProgressBar
                      value={c.views > 0 ? (c.whatsapp / c.views) * 100 : 0}
                      tone="emerald"
                      label={`WA rate ${Math.round((c.rate || 0) * 100)}%`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">
                No campaigns detected yet
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-500 mt-2">
            Campaign key: utm_campaign → gad_campaignid fallback.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function prettyCampaign(c: string) {
  if (!c) return "—";
  if (c.startsWith("utm:")) return `UTM • ${c.replace("utm:", "")}`;
  if (c.startsWith("gad:")) return `GAds • ${c.replace("gad:", "")}`;
  return c;
}

function Pill({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
      {label}
    </span>
  );
}

function RowRank({
  idx,
  label,
  value,
  badgeTone,
}: {
  idx: number;
  label: string;
  value: number;
  badgeTone: "emerald" | "indigo" | "amber" | "sky" | "violet" | "green";
}) {
  const badge = {
    emerald: "bg-emerald-50 text-emerald-700",
    green: "bg-green-50 text-green-700",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-800",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  }[badgeTone];

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${badge}`}
        >
          {idx + 1}
        </span>
        <span className="font-semibold text-gray-900 truncate">{label}</span>
      </div>
      <span className="font-bold text-gray-800">{value}</span>
    </div>
  );
}

function Kpi({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "sky" | "indigo" | "violet" | "green";
}) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    green: "bg-green-50 border-green-200 text-green-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
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

function MiniBars({
  items,
}: {
  items: {
    label: string;
    value: number;
    tone: "emerald" | "indigo" | "amber" | "sky" | "green";
  }[];
}) {
  const max = Math.max(...items.map((x) => x.value), 1);

  return (
    <div className="space-y-2">
      {items.map((x) => (
        <div key={x.label}>
          <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
            <span className="font-semibold">{x.label}</span>
            <span className="font-bold text-gray-800">{x.value}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full ${barTone(x.tone)}`}
              style={{ width: `${Math.round((x.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function barTone(tone: string) {
  if (tone === "emerald") return "bg-emerald-400";
  if (tone === "green") return "bg-green-400";
  if (tone === "amber") return "bg-amber-400";
  if (tone === "sky") return "bg-sky-400";
  return "bg-indigo-400";
}

function ProgressBar({
  value,
  tone,
  label,
}: {
  value: number; // 0-100
  tone: "emerald" | "amber" | "violet" | "sky";
  label: string;
}) {
  const c =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "violet"
      ? "bg-violet-400"
      : "bg-sky-400";

  const v = Math.max(0, Math.min(100, value || 0));

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
        <span className="font-semibold">{label}</span>
        <span className="font-bold text-gray-800">{Math.round(v)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${c}`} style={{ width: `${Math.round(v)}%` }} />
      </div>
    </div>
  );
}
