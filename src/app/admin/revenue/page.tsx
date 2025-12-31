import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import DashboardFilters from "../_components/DashboardFilters";
import FleetHealth from "./_components/FleetHealth"; 
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Revenue Analytics",
  description: "Detailed financial reports and fleet performance.",
  path: "/admin/revenue",
});

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all" | "custom";

// --- HELPERS ---
function isValidDate(d: any): d is Date { return d instanceof Date && !isNaN(d.getTime()); }
function safeISO(d: Date) { return isValidDate(d) ? d.toISOString() : new Date().toISOString(); }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
function fmtMoney(v?: number | null) { return `RM ${Number(v ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 0 })}`; }

// ✅ Vibrant Chart Colors
const CHART_COLORS = [
  "bg-blue-500 group-hover:bg-blue-600",
  "bg-violet-500 group-hover:bg-violet-600",
  "bg-emerald-500 group-hover:bg-emerald-600",
  "bg-amber-500 group-hover:bg-amber-600",
  "bg-rose-500 group-hover:bg-rose-600",
  "bg-cyan-500 group-hover:bg-cyan-600",
  "bg-indigo-500 group-hover:bg-indigo-600",
  "bg-fuchsia-500 group-hover:bg-fuchsia-600",
  "bg-lime-500 group-hover:bg-lime-600",
];

// ✅ Helper to format X-Axis Labels (Monthly vs Daily)
function getTrendLabel(key: string, isMonthly: boolean) {
   if (!key || key === 'Unknown') return '-';
   const parts = key.split('-');
   const y = parts[0]?.slice(2);
   const mIndex = parseInt(parts[1] || "1") - 1;
   const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
   const m = months[mIndex] || '';
   
   if (isMonthly) return `${m} '${y}`; // Format: Jan '25
   return `${parts[2]} ${m}`; // Format: 01 Jan
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
  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("city")) return "Honda City";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("xpander")) return "Mitsubishi Xpander";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  return rawName.replace(/\b\w/g, l => l.toUpperCase());
}

function getRange(period: Period, fromParam: string, toParam: string, now = new Date()) {
  if (period === "custom" && fromParam && toParam) {
    const s = new Date(fromParam);
    const e = new Date(toParam);
    if (isValidDate(s) && isValidDate(e)) { e.setHours(23, 59, 59, 999); return { start: s, end: e }; }
  }
  let start: Date;
  if (period === "all") return { start: new Date(0), end: now }; 
  if (period === "daily") start = startOfDay(now);
  else if (period === "weekly") { start = new Date(now); start.setDate(now.getDate() - 7); }
  else if (period === "monthly") { start = new Date(now); start.setMonth(now.getMonth() - 1); }
  else if (period === "quarterly") { start = new Date(now); start.setMonth(now.getMonth() - 3); }
  else if (period === "yearly") { start = new Date(now); start.setFullYear(now.getFullYear() - 1); }
  else start = startOfDay(now);
  return { start, end: now };
}

function diffDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; model?: string; plate?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const gate = await requireAdmin();
  if (!gate.ok) return <div className="p-6 text-red-600">Access Denied</div>;

  const period = (sp.period as Period) || "monthly";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const { start, end } = getRange(period, sp.from || "", sp.to || "", new Date());
  
  const supabase = await createSupabaseServer();

  // 1. Fetch Filters & Fleet
  const { data: allAgreements } = await supabase.from("agreements").select("car_type, plate_number").limit(3000);
  
  // Fleet list for the Widget (Active cars only)
  const { data: carsTable } = await supabase
    .from("cars")
    .select("id, plate_number, catalog:car_catalog(make, model)")
    .neq("status", "inactive");
    
  const fleetList = (carsTable ?? []).map((c: any) => ({
    id: c.id,
    plate: c.plate_number,
    model: normalizeModel(`${c.catalog?.make ?? ''} ${c.catalog?.model ?? ''}`),
  }));

  const uniqueModels = Array.from(new Set(fleetList.map(c => c.model))).sort();
  const uniquePlates = Array.from(new Set(fleetList.map(c => c.plate))).sort();

  // 2. Fetch Agreements (Revenue Data)
  let query = supabase
    .from("agreements")
    .select("id, car_type, plate_number, date_start, date_end, total_price, status, car_id")
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .order("date_start", { ascending: false });

  if (period !== "all") query = query.gte("date_start", safeISO(start)).lte("date_start", safeISO(end));
  if (filterPlate) query = query.eq("plate_number", filterPlate);

  const { data: rowsRaw } = await query.limit(5000);
  let rows = (rowsRaw ?? []) as any[];
  if (filterModel) rows = rows.filter(r => normalizeModel(r.car_type) === filterModel);

  // 3. Historical Data for Fleet Widget (Always >1 Year to calculate inactive/active states)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const { data: historicalRaw } = await supabase
    .from("agreements")
    .select("car_id, date_start, total_price")
    .gte("date_start", safeISO(oneYearAgo))
    .neq("status", "Cancelled");

  // --- ANALYTICS PROCESSING ---
  let totalRev = 0;
  const trendMap = new Map<string, number>();

  // ✅ Determine Grouping Strategy (Monthly vs Daily)
  const daySpan = diffDays(start.toISOString(), end.toISOString());
  const isMonthlyGroup = period === 'yearly' || period === 'all' || daySpan > 60;

  rows.forEach(r => {
    const val = Number(r.total_price) || 0;
    totalRev += val;
    
    // ✅ Logic: Group by YYYY-MM if Yearly/All, else YYYY-MM-DD
    let k = 'Unknown';
    if (r.date_start) {
        if (isMonthlyGroup) {
            k = r.date_start.slice(0, 7); // YYYY-MM
        } else {
            k = r.date_start.split('T')[0]; // YYYY-MM-DD
        }
    }
    trendMap.set(k, (trendMap.get(k) || 0) + val);
  });

  const sortedTrends = Array.from(trendMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxTrend = Math.max(...sortedTrends.map(x => x[1]), 1);

  // Utilization
  const uniquePlatesCount = uniquePlates.length || 1;
  const totalDays = rows.reduce((acc, r) => acc + diffDays(r.date_start, r.date_end), 0);
  const utilization = (totalDays / (uniquePlatesCount * Math.max(1, daySpan))) * 100;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <Link href="/admin" className="text-sm underline text-gray-500 hover:text-black">
            Back to Dashboard
          </Link>
        </div>
        <Suspense fallback={<div className="h-20 bg-white animate-pulse rounded-xl" />}>
          <DashboardFilters plates={uniquePlates} models={uniqueModels} />
        </Suspense>
      </div>

      {/* --- ROW 1: KPI & Trend --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KPI Card */}
        <div className="bg-linear-to-br from-indigo-900 to-slate-800 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-60 font-semibold">Total Revenue</div>
            <div className="text-4xl font-bold mt-2">{fmtMoney(totalRev)}</div>
            <div className="mt-2 text-sm opacity-70">
              {period === 'all' ? 'All time' : `in this ${period}`}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
             <div>
               <div className="text-xs opacity-60">Fleet Util.</div>
               <div className="text-lg font-semibold">{utilization.toFixed(1)}%</div>
             </div>
             <div>
               <div className="text-xs opacity-60">Avg. Ticket</div>
               <div className="text-lg font-semibold">{rows.length > 0 ? fmtMoney(totalRev / rows.length) : '-'}</div>
             </div>
          </div>
        </div>

        {/* --- Colorful Trend Chart --- */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
              Revenue Trend ({isMonthlyGroup ? "Monthly" : "Daily"})
            </h3>
            <span className="text-xs text-gray-400">{sortedTrends.length} points</span>
          </div>

          <div className="flex-1 flex items-end gap-1 md:gap-2 min-h-55">
            {sortedTrends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No data found</div>
            ) : (
              sortedTrends.map(([date, val], i) => {
                const h = Math.max(5, (val / maxTrend) * 100);
                const colorClass = CHART_COLORS[i % CHART_COLORS.length]; // Cycle colors

                return (
                  <div key={date} className="flex-1 group relative flex flex-col justify-end h-full">
                    {/* Bar with Color Cycle */}
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 relative ${colorClass}`} 
                      style={{ height: `${h}%` }}
                    >
                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap z-10 pointer-events-none">
                      <span className="font-bold text-base">{fmtMoney(val)}</span>
                      <span className="opacity-80">{getTrendLabel(date, isMonthlyGroup)}</span>
                      {/* Tooltip Arrow */}
                      <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1"></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            <span>{sortedTrends.length > 0 ? getTrendLabel(sortedTrends[0][0], isMonthlyGroup) : ''}</span>
            <span>{sortedTrends.length > 0 ? getTrendLabel(sortedTrends[sortedTrends.length-1][0], isMonthlyGroup) : ''}</span>
          </div>
        </div>
      </div>

      {/* --- ROW 2: FLEET HEALTH WIDGET (Active/Inactive) --- */}
      {/* Passes raw historical data so the Client Component can filter 1m/3m/6m/1y */}
      <FleetHealth cars={fleetList} agreements={historicalRaw as any[]} />

    </div>
  );
}