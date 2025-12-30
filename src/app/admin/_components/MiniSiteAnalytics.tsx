import Link from "next/link";

type TopModel = { key: string; count: number };
type TopReferrer = { key: string; count: number };

export default function MiniSiteAnalytics({
  activeUsers,
  whatsappClicks,
  phoneClicks,
  traffic,
  topModels,
  topReferrers,
}: {
  activeUsers: number;
  whatsappClicks: number;
  phoneClicks: number;
  traffic: { direct: number; organic: number; paid: number; referral: number };
  topModels: TopModel[];
  topReferrers: TopReferrer[];
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">
            Website Analytics (Last 24h)
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
        <Kpi title="Active Users" value={activeUsers} tone="indigo" />
        <Kpi title="WhatsApp" value={whatsappClicks} tone="emerald" />
        <Kpi title="Calls" value={phoneClicks} tone="rose" />
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
            Top Models (all car activity)
          </div>
          <div className="space-y-2">
            {topModels.length ? (
              topModels.slice(0, 5).map((m, i) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{m.key}</span>
                  </div>
                  <span className="font-bold text-gray-800">{m.count}</span>
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
                  key={r.key}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{r.key}</span>
                  </div>
                  <span className="font-bold text-gray-800">{r.count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">No referrers yet</div>
            )}
          </div>
        </div>
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
