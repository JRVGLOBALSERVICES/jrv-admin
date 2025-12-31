import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import DashboardFilters from "../_components/DashboardFilters";
import FleetHealth from "./_components/FleetHealth";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Revenue Analytics",
  description: "Financial performance and fleet utilization.",
  path: "/admin/revenue",
});

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all"
  | "custom";

const CHART_GRADIENTS = [
  "from-cyan-400 to-blue-600 shadow-blue-200",
  "from-violet-400 to-purple-600 shadow-purple-200",
  "from-emerald-400 to-green-600 shadow-green-200",
  "from-amber-400 to-orange-600 shadow-orange-200",
  "from-rose-400 to-red-600 shadow-rose-200",
  "from-fuchsia-400 to-pink-600 shadow-pink-200",
  "from-sky-400 to-indigo-600 shadow-indigo-200",
  "from-lime-400 to-emerald-600 shadow-lime-200",
];

const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
}
function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
  })}`;
}
function fmtPercent(v: number) {
  return `${v.toFixed(1)}%`;
}

// Helper: Convert a UTC Instant to the start of that day in KL Time
function startOfDayInKLToUTC(baseUtc: Date) {
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  const d = kl.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KL_OFFSET_MS);
}

function parseKLMidnightToUTC(dateYYYYMMDD: string) {
  const [y, m, d] = dateYYYYMMDD.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - KL_OFFSET_MS);
  return isValidDate(dt) ? dt : null;
}

function parseKLEndOfDayToUTC(dateYYYYMMDD: string) {
  const s = parseKLMidnightToUTC(dateYYYYMMDD);
  if (!s) return null;
  return new Date(s.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function getRange(
  period: Period,
  fromParam: string,
  toParam: string,
  now = new Date()
) {
  if (period === "custom" && fromParam && toParam) {
    const s = parseKLMidnightToUTC(fromParam);
    const e = parseKLEndOfDayToUTC(toParam);
    if (s && e) return { start: s, end: e };
  }
  if (period === "all") return { start: new Date(0), end: now };

  let start: Date;
  if (period === "daily") start = startOfDayInKLToUTC(now);
  else if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = startOfDayInKLToUTC(d);
  } else if (period === "monthly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = startOfDayInKLToUTC(d);
  } else if (period === "quarterly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    start = startOfDayInKLToUTC(d);
  } else if (period === "yearly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 365);
    start = startOfDayInKLToUTC(d);
  } else start = startOfDayInKLToUTC(now);

  return { start, end: now };
}

function normalizeModel(rawName: string | null) {
  if (!rawName) return "Unknown";
  const lower = rawName.toLowerCase().trim();
  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) return "Perodua Myvi";
  if (lower.includes("axia")) return "Perodua Axia";
  if (lower.includes("alza")) return "Perodua Alza";
  if (lower.includes("saga")) return "Proton Saga";
  if (lower.includes("person")) return "Proton Persona";
  if (lower.includes("exora")) return "Proton Exora";
  if (lower.includes("x50")) return "Proton X50";
  if (lower.includes("x70")) return "Proton X70";
  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("city")) return "Honda City";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  return rawName.replace(/\b\w/g, (l) => l.toUpperCase());
}

function StatCard({
  title,
  value,
  sub,
  trend,
  color = "blue",
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: string;
  color?: string;
}) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    orange: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <div
      className={`p-5 rounded-xl border ${colors[color]} flex flex-col justify-between h-full`}
    >
      <div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-70">
          {title}
        </div>
        <div className="text-3xl font-black mt-2">{value}</div>
      </div>
      {(sub || trend) && (
        <div className="mt-4 flex items-center justify-between text-sm font-medium opacity-80">
          <span>{sub}</span>
          {trend && (
            <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    model?: string;
    plate?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const gate = await requireAdmin();
  if (!gate.ok)
    return <div className="p-10 text-center text-red-600">Access Denied</div>;

  const period = (sp.period as Period) || "monthly";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const { start, end } = getRange(
    period,
    sp.from || "",
    sp.to || "",
    new Date()
  );

  const supabase = await createSupabaseServer();

  const { data: carsTable } = await supabase
    .from("cars")
    .select("id, plate_number, status, catalog:car_catalog(make, model)")
    .neq("status", "inactive");

  const fleet = (carsTable ?? []).map((c: any) => ({
    id: c.id,
    plate: c.plate_number,
    model: normalizeModel(
      `${(Array.isArray(c.catalog) ? c.catalog[0] : c.catalog)?.make ?? ""} ${
        (Array.isArray(c.catalog) ? c.catalog[0] : c.catalog)?.model ?? ""
      }`
    ),
  }));

  const uniqueModels = Array.from(new Set(fleet.map((c) => c.model))).sort();
  const uniquePlates = Array.from(new Set(fleet.map((c) => c.plate))).sort();

  // 1. REVENUE QUERY (Agreements starting in period)
  // Logic: Status NOT 'Deleted' AND NOT 'Cancelled'
  let query = supabase
    .from("agreements")
    .select(
      "id, car_type, plate_number, date_start, date_end, total_price, status, car_id"
    )
    .neq("status", "Deleted")
    .neq("status", "Cancelled") // ✅ EXCLUDE CANCELLED
    .order("date_start", { ascending: false });

  if (period !== "all")
    query = query
      .gte("date_start", safeISO(start))
      .lte("date_start", safeISO(end));
  if (filterPlate) query = query.eq("plate_number", filterPlate);

  const { data: bookedRowsRaw } = await query.limit(5000);
  let bookedRows = (bookedRowsRaw ?? []) as any[];
  if (filterModel)
    bookedRows = bookedRows.filter(
      (r) => normalizeModel(r.car_type) === filterModel
    );

  // 2. UTILIZATION QUERY (Agreements overlapping period)
  // Used only for the Utilization % KPI card
  const lookback = new Date(start);
  lookback.setMonth(lookback.getMonth() - 6);

  let utilQuery = supabase
    .from("agreements")
    .select("car_id, date_start, date_end, total_price, plate_number")
    .neq("status", "Deleted")
    .neq("status", "Cancelled") // ✅ Consistency
    .gte("date_end", safeISO(start))
    .lte("date_start", safeISO(end));

  if (filterPlate) utilQuery = utilQuery.eq("plate_number", filterPlate);

  const { data: utilRowsRaw } = await utilQuery.limit(5000);

  // --- STATS CALC ---
  const totalRevenue = bookedRows.reduce(
    (sum, r) => sum + (Number(r.total_price) || 0),
    0
  );
  const totalBookings = bookedRows.length;
  const avgTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Utilization
  const periodDurationMs = end.getTime() - start.getTime();
  const periodDays = Math.max(
    1,
    Math.ceil(periodDurationMs / (1000 * 60 * 60 * 24))
  );
  const fleetSize = fleet.length || 1;
  const theoreticalCapacityDays = fleetSize * periodDays;
  let actualRentedDays = 0;
  (utilRowsRaw ?? []).forEach((r: any) => {
    const s = new Date(r.date_start).getTime();
    const e = new Date(r.date_end).getTime();
    const overlapStart = Math.max(s, start.getTime());
    const overlapEnd = Math.min(e, end.getTime());
    if (overlapEnd > overlapStart) {
      actualRentedDays += (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
    }
  });
  const utilization = Math.min(
    100,
    (actualRentedDays / theoreticalCapacityDays) * 100
  );

  // Top Models
  const modelMap = new Map<string, number>();
  bookedRows.forEach((r) => {
    const m = normalizeModel(r.car_type);
    modelMap.set(m, (modelMap.get(m) || 0) + (Number(r.total_price) || 0));
  });
  const topModels = Array.from(modelMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Trend
  const isLongPeriod =
    period === "yearly" || period === "all" || periodDays > 60;
  const trendMap = new Map<string, number>();
  bookedRows.forEach((r) => {
    if (!r.date_start) return;
    const d = new Date(r.date_start);
    const dKL = new Date(d.getTime() + KL_OFFSET_MS);
    const key = isLongPeriod
      ? `${dKL.getUTCFullYear()}-${String(dKL.getUTCMonth() + 1).padStart(
          2,
          "0"
        )}`
      : `${dKL.getUTCFullYear()}-${String(dKL.getUTCMonth() + 1).padStart(
          2,
          "0"
        )}-${String(dKL.getUTCDate()).padStart(2, "0")}`;
    trendMap.set(key, (trendMap.get(key) || 0) + Number(r.total_price));
  });
  const sortedTrend = Array.from(trendMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="bg-white border-b px-6 py-5 top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-black transition">
                Dashboard
              </Link>
              <span>/</span>
              <span>Revenue</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Financial Performance
            </h1>
          </div>
          <div className="shrink-0">
            <Suspense
              fallback={
                <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
              }
            >
              <DashboardFilters plates={uniquePlates} models={uniqueModels} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={fmtMoney(totalRevenue)}
            sub="Booked in period"
            color="green"
          />
          <StatCard
            title="Avg. Ticket"
            value={fmtMoney(avgTicket)}
            sub={`${totalBookings} bookings`}
            color="blue"
          />
          <StatCard
            title="Fleet Utilization"
            value={fmtPercent(utilization)}
            sub={`${fleetSize} active cars`}
            color="purple"
          />
          <StatCard
            title="Revenue / Car"
            value={fmtMoney(fleetSize ? totalRevenue / fleetSize : 0)}
            sub="Avg per active car"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800">Revenue Trend</h3>
              <div className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">
                {isLongPeriod ? "Monthly" : "Daily"}
              </div>
            </div>
            <div className="flex-1 min-h-75 flex items-end gap-2 pb-2 border-b border-gray-100">
              {sortedTrend.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No data for this period
                </div>
              ) : (
                sortedTrend.map(([date, val], index) => {
                  const max = Math.max(...sortedTrend.map((s) => s[1]), 1);
                  const h = (val / max) * 100;
                  const gradientClass =
                    CHART_GRADIENTS[index % CHART_GRADIENTS.length];
                  return (
                    <div
                      key={date}
                      className="flex-1 group relative flex flex-col justify-end h-full"
                    >
                      <div
                        className={`w-full min-w-1 rounded-t-md bg-linear-to-br ${gradientClass} relative overflow-hidden transition-all duration-300 hover:brightness-110 hover:scale-y-105 origin-bottom shadow-lg`}
                        style={{ height: `${Math.max(h, 2)}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/40 to-transparent pointer-events-none" />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none shadow-xl transition-opacity">
                        <div className="font-bold">{fmtMoney(val)}</div>
                        <div className="text-[10px] text-gray-400">{date}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 font-mono">
              <span>{sortedTrend[0]?.[0]}</span>
              <span>{sortedTrend[sortedTrend.length - 1]?.[0]}</span>
            </div>
          </div>

          <div className="bg-white p-0 rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Top Earning Models</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {topModels.map(([model, rev], i) => (
                <div
                  key={model}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${
                        i < 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-black">
                      {model}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {fmtMoney(rev)}
                  </span>
                </div>
              ))}
              {topModels.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No models found
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 text-center">
              <Link
                href="/admin/cars"
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View All Cars →
              </Link>
            </div>
          </div>
        </div>

        <div className="h-125">
          {/* ✅ Pass bookedRows to match "Total Revenue" KPI. FleetHealth now strictly aggregates this input. */}
          <FleetHealth cars={fleet} agreements={bookedRows as any[]} />
        </div>
      </div>
    </div>
  );
}
