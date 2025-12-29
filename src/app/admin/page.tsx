import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import ExpiringSoon from "../admin/_components/ExpiringSoon";
import DashboardFilters from "../admin/_components/DashboardFilters";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "JRV Admin Overview",
  path: "/admin",
  index: false,
});

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all" | "custom";

type AgreementLite = {
  id: string;
  car_type: string | null;
  plate_number: string | null;
  mobile: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
};

// --- Date Helpers ---
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfDay(monday);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1, 0, 0, 0, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}
function toISO(d: Date) {
  return d.toISOString();
}
function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
}

// --- MERGING LOGIC: Normalize Car Names ---
// This merges "Perodua Bezza", "Bezza 1.3", "Bezza" into "Perodua Bezza"
function normalizeModel(rawName: string | null) {
  if (!rawName) return "Unknown";
  const lower = rawName.toLowerCase().trim();

  if (lower.includes("bezza")) return "Perodua Bezza";
  if (lower.includes("myvi")) return "Perodua Myvi";
  if (lower.includes("axia")) return "Perodua Axia";
  if (lower.includes("alza")) return "Perodua Alza";
  if (lower.includes("aruz")) return "Perodua Aruz";
  if (lower.includes("ativa")) return "Perodua Ativa";
  
  if (lower.includes("saga")) return "Proton Saga";
  if (lower.includes("person")) return "Proton Persona"; // catches persona
  if (lower.includes("exora")) return "Proton Exora";
  if (lower.includes("x50")) return "Proton X50";
  if (lower.includes("x70")) return "Proton X70";
  if (lower.includes("x90")) return "Proton X90";

  if (lower.includes("vios")) return "Toyota Vios";
  if (lower.includes("yaris")) return "Toyota Yaris";
  if (lower.includes("alphard")) return "Toyota Alphard";
  if (lower.includes("vellfire")) return "Toyota Vellfire";
  if (lower.includes("innova")) return "Toyota Innova";

  if (lower.includes("city")) return "Honda City";
  if (lower.includes("civic")) return "Honda Civic";
  if (lower.includes("brv") || lower.includes("br-v")) return "Honda BR-V";
  if (lower.includes("crv") || lower.includes("cr-v")) return "Honda CR-V";
  
  if (lower.includes("xpander")) return "Mitsubishi Xpander";
  if (lower.includes("triton")) return "Mitsubishi Triton";

  // Fallback: Return formatted original (Capitalize Words)
  return rawName.replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to determine date range
function getRange(period: Period, fromParam: string, toParam: string, now = new Date()) {
  if (period === "custom" && fromParam && toParam) {
    // Force end of day for the 'to' date to include that full day
    const s = new Date(fromParam);
    const e = new Date(toParam);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  let start: Date;
  if (period === "all") return { start: new Date(0), end: now }; 
  if (period === "daily") start = startOfDay(now);
  else if (period === "weekly") start = startOfWeekMonday(now);
  else if (period === "monthly") start = startOfMonth(now);
  else if (period === "quarterly") start = startOfQuarter(now);
  else if (period === "yearly") start = startOfYear(now);
  else start = startOfDay(now); // default fallback

  return { start, end: now };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; model?: string; plate?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period = (sp.period as Period) || "daily";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const fromParam = sp.from || "";
  const toParam = sp.to || "";

  const { start, end } = getRange(period, fromParam, toParam, new Date());
  const supabase = await createSupabaseServer();

  // 1. Fetch Filter Options (All time) for dropdowns
  const { data: allAgreements } = await supabase
    .from("agreements")
    .select("car_type, plate_number")
    .limit(3000); 
  
  // Use the normalizer for the dropdown options too, to keep it clean
  const uniqueModels = Array.from(new Set((allAgreements ?? [])
    .map(a => normalizeModel(a.car_type))
    .filter(Boolean))) as string[];
    
  const uniquePlates = Array.from(new Set((allAgreements ?? []).map(a => a.plate_number).filter(Boolean))) as string[];
  uniqueModels.sort();
  uniquePlates.sort();

  // 2. Fetch Revenue Analytics Data
  let query = supabase
    .from("agreements")
    .select("id, car_type, plate_number, mobile, status, date_start, date_end, total_price")
    .neq("status", "Cancelled") // Exclude cancelled
    .neq("status", "Deleted")   // Exclude deleted
    .order("date_start", { ascending: false });

  // Apply Date Filter (if not 'all')
  if (period !== "all") {
    query = query.gte("date_start", toISO(start)).lte("date_start", toISO(end));
  }

  // Apply Dropdown Filters
  // Note: We can't filter 'normalized' models in SQL easily without a generated column.
  // So we filter exact match if possible, or we filter in JS below for models.
  // Plates are usually exact.
  if (filterPlate) query = query.eq("plate_number", filterPlate);

  const { data: revenueData, error } = await query.limit(5000);

  if (error) {
    return <div className="p-6 text-red-600">Error loading dashboard: {error.message}</div>;
  }

  let rows = (revenueData ?? []) as AgreementLite[];

  // JS Filter for Model (because we are normalizing)
  if (filterModel) {
    rows = rows.filter(r => normalizeModel(r.car_type) === filterModel);
  }

  // 3. Calculate KPI Stats
  const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
  
  // Group by Normalized Car Type
  const byCarType = new Map<string, { count: number; revenue: number }>();
  for (const r of rows) {
    const key = normalizeModel(r.car_type); // <--- Normalization happens here
    const prev = byCarType.get(key) || { count: 0, revenue: 0 };
    prev.count += 1;
    prev.revenue += Number(r.total_price) || 0;
    byCarType.set(key, prev);
  }
  
  const breakdown = Array.from(byCarType.entries())
    .map(([car_type, v]) => ({ car_type, ...v }))
    .sort((a, b) => b.revenue - a.revenue); // Sort by Revenue desc

  // 4. Fetch Expiring Soon (Next 48H)
  const now = new Date();
  const soonUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h window

  const { data: expiring } = await supabase
    .from("agreements")
    .select("id, car_type, plate_number, mobile, status, date_start, date_end, total_price")
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .gte("date_end", toISO(now))
    .lte("date_end", toISO(soonUntil))
    .order("date_end", { ascending: true })
    .limit(20);

  const expiringRows = (expiring ?? []) as AgreementLite[];

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header & Filter Bar */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-500 hidden md:block">
            {period === 'all' 
              ? 'All Time Data' 
              : period === 'custom'
                ? `${start.toLocaleDateString()} — ${end.toLocaleDateString()} (Custom)`
                : `${start.toLocaleDateString()} — ${end.toLocaleDateString()} (${period})`
            }
          </div>
        </div>
        
        {/* Interactive Filter Component */}
        <DashboardFilters plates={uniquePlates} models={uniqueModels} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start opacity-80 mb-2">
            <span className="text-sm font-medium uppercase tracking-wide">Total Revenue</span>
            <span className="bg-white/20 p-1.5 rounded-lg">💰</span>
          </div>
          <div className="text-3xl font-bold">{fmtMoney(totalRevenue)}</div>
          <div className="text-sm mt-1 opacity-90">{rows.length} agreements</div>
        </div>

        {/* Top Performer Card */}
        <div className="bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Car Model</div>
            <div className="text-2xl font-bold text-gray-800 mt-1 truncate">
              {breakdown[0]?.car_type ?? "—"}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
              {breakdown[0] ? breakdown[0].count : 0} Trips
            </span>
            <span className="text-gray-400">•</span>
            <span>{breakdown[0] ? fmtMoney(breakdown[0].revenue) : "RM 0"}</span>
          </div>
        </div>

        {/* Utilization/Average Card */}
        <div className="bg-white rounded-xl p-5 border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg. Ticket Size</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">
              {rows.length > 0 ? fmtMoney(totalRevenue / rows.length) : "RM 0"}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Per agreement average
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expiring & Tracking */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Expiring Section */}
          <ExpiringSoon
            title="Expiring Soon ⏳"
            subtitle="Live status & direct contact"
            rows={expiringRows}
          />

          {/* Marketing Placeholder (Rewire Target) */}
          <div className="bg-white rounded-xl border shadow-sm p-5 opacity-70 grayscale transition hover:grayscale-0 hover:opacity-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Website & Traffic</h3>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">Connecting...</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: "Views", val: "—" },
                { label: "Clicks", val: "—" },
                { label: "Leads", val: "—" },
                { label: "Conv.", val: "—%" }
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase">{s.label}</div>
                  <div className="font-bold text-gray-700 text-lg">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Breakdown */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Revenue by Model</h3>
            <div className="text-xs text-gray-500">Ranked by total earnings</div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-125">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2 text-right">Trips</th>
                  <th className="px-4 py-2 text-right">Rev</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {breakdown.map((b) => (
                  <tr key={b.car_type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.car_type}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {Number(b.revenue).toLocaleString("en-MY")}
                    </td>
                  </tr>
                ))}
                {breakdown.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-400">
                      No data found for these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}