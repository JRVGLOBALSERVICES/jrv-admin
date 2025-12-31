export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import DashboardFilters from "../_components/DashboardFilters";
import FleetHealth from "./_components/FleetHealth";
import { pageMetadata } from "@/lib/seo";
import { normalizePlate, formatPlate } from "@/lib/analytics/plates";
import { rentalDaysFloatInWindow } from "@/lib/analytics/rentalDays";

export const metadata = pageMetadata({
  title: "Revenue Analytics",
  description: "Detailed financial reports and fleet performance.",
  path: "/admin/revenue",
  index: false,
});

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all" | "custom";

type CarRow = {
  id: string;
  plate_number: string | null;
  status?: string | null;
  catalog_rel?: { make?: string | null; model?: string | null } | any;
  catalog?: { make?: string | null; model?: string | null } | any;
};

type AgreementRow = {
  id: string;
  car_id: string | null;
  car_type: string | null;
  plate_number: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
  status: string | null;
};

function isValidDate(d: any): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}
function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
}

function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* ===========================
   KL window helper (rolling)
   =========================== */
const DAY_MS = 24 * 60 * 60 * 1000;

function parseYYYYMMDD(d: string) {
  const [y, m, day] = d.split("-").map((x) => Number(x));
  if (!y || !m || !day) return null;
  const dt = new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
  return isValidDate(dt) ? dt : null;
}

function getWindow(period: Period, fromParam: string, toParam: string, now = new Date()) {
  if (period === "custom" && fromParam && toParam) {
    const s = parseYYYYMMDD(fromParam);
    const e0 = parseYYYYMMDD(toParam);
    if (s && e0) {
      const e = new Date(e0.getTime() + DAY_MS - 1);
      return { start: s, end: e };
    }
  }

  if (period === "all") return { start: new Date(0), end: now };

  const end = now;
  if (period === "daily") return { start: new Date(end.getTime() - DAY_MS), end };
  if (period === "weekly") return { start: new Date(end.getTime() - 7 * DAY_MS), end };
  if (period === "monthly") return { start: new Date(end.getTime() - 30 * DAY_MS), end };
  if (period === "quarterly") return { start: new Date(end.getTime() - 90 * DAY_MS), end };
  if (period === "yearly") return { start: new Date(end.getTime() - 365 * DAY_MS), end };
  return { start: new Date(end.getTime() - DAY_MS), end };
}

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
  if (lower.includes("person")) return "Proton Persona";
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
  return rawName.replace(/\b\w/g, (l) => l.toUpperCase());
}

function getTrendLabel(key: string, isHourly: boolean, isMonthly: boolean) {
  if (!key || key === "Unknown") return "-";
  if (isHourly) return `${key.slice(11, 13)}:00`;
  const parts = key.split("-");
  const y = parts[0]?.slice(2);
  const mIndex = parseInt(parts[1] || "1") - 1;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[mIndex] || "";
  if (isMonthly) return `${m} '${y}`;
  return `${parts[2]} ${m}`;
}

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

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; model?: string; plate?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const gate = await requireAdmin();
  if (!gate.ok) return <div className="p-6 text-red-600">Access Denied</div>;

  const period = (sp.period as Period) || "daily";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const fromParam = sp.from || "";
  const toParam = sp.to || "";

  const { start, end } = getWindow(period, fromParam, toParam, new Date());

  const supabase = await createSupabaseServer();

  // -------------------------
  // Fleet dropdowns: cars table (only available + rented)
  // -------------------------
  const { data: carsTable, error: carsErr } = await supabase
    .from("cars")
    .select("id, plate_number, status, catalog_rel:catalog_id ( make, model )")
    .in("status", ["available", "rented"])
    .order("plate_number", { ascending: true })
    .limit(5000);

  if (carsErr) return <div className="p-6 text-red-600">Error: {carsErr.message}</div>;

  const fleetList = ((carsTable ?? []) as CarRow[]).map((c) => {
    const rel: any = Array.isArray((c as any).catalog_rel) ? (c as any).catalog_rel[0] : (c as any).catalog_rel;
    const make = String(rel?.make ?? "").trim();
    const model = String(rel?.model ?? "").trim();
    const label = normalizeModel(`${make} ${model}`.trim());
    return {
      id: c.id,
      plate: c.plate_number ?? "",
      plate_norm: normalizePlate(c.plate_number),
      model: label,
      model_norm: label,
    };
  });

  const uniqueModels = Array.from(new Set(fleetList.map((c) => c.model))).filter(Boolean).sort();
  const uniquePlates = Array.from(new Set(fleetList.map((c) => formatPlate(c.plate)))).filter(Boolean).sort();

  // -------------------------
  // Agreements in range (Revenue cards + trend)
  // IMPORTANT: range is based on date_start (new bookings in the window)
  // -------------------------
  let agreementsQ = supabase
    .from("agreements")
    .select("id, car_id, car_type, plate_number, date_start, date_end, total_price, status")
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .order("date_start", { ascending: false });

  if (period !== "all") {
    agreementsQ = agreementsQ.gte("date_start", safeISO(start)).lt("date_start", safeISO(end));
  }

  const { data: rowsRaw, error: agErr } = await agreementsQ.limit(20000);
  if (agErr) return <div className="p-6 text-red-600">Error: {agErr.message}</div>;

  let rows = (rowsRaw ?? []) as AgreementRow[];

  // Post-filter plate/model (robust, handles space variations)
  if (filterPlate) {
    const fp = normalizePlate(filterPlate);
    rows = rows.filter((r) => normalizePlate(r.plate_number) === fp);
  }
  if (filterModel) {
    rows = rows.filter((r) => normalizeModel(r.car_type) === filterModel);
  }

  // -------------------------
  // Revenue totals + trend buckets
  // -------------------------
  let totalRev = 0;
  const trendMap = new Map<string, number>();

  const spanDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
  const isHourly = period === "daily";
  const isMonthlyGroup = period === "yearly" || period === "all" || spanDays > 60;

  for (const r of rows) {
    const val = Number(r.total_price) || 0;
    totalRev += val;

    let k = "Unknown";
    if (r.date_start) {
      if (isHourly) {
        const dt = new Date(r.date_start);
        if (isValidDate(dt)) k = dt.toISOString().slice(0, 13);
      } else if (isMonthlyGroup) {
        k = String(r.date_start).slice(0, 7);
      } else {
        k = String(r.date_start).split("T")[0];
      }
    }
    trendMap.set(k, (trendMap.get(k) || 0) + val);
  }

  const sortedTrends = Array.from(trendMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxTrend = Math.max(...sortedTrends.map((x) => x[1]), 1);

  // -------------------------
  // Fleet utilization (days running) in selected window:
  // use agreements that OVERLAP the window, not just date_start
  // -------------------------
  let overlapQ = supabase
    .from("agreements")
    .select("id, car_id, car_type, plate_number, date_start, date_end, total_price, status")
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .lte("date_start", safeISO(end))
    .gte("date_end", safeISO(start))
    .order("date_start", { ascending: false });

  const { data: overlapRowsRaw, error: ovErr } = await overlapQ.limit(50000);
  if (ovErr) return <div className="p-6 text-red-600">Error: {ovErr.message}</div>;

  const overlapRows = (overlapRowsRaw ?? []) as AgreementRow[];

  // utilization is based on overlap days across the whole fleet
  let totalDaysRunning = 0;
  for (const r of overlapRows) {
    totalDaysRunning += rentalDaysFloatInWindow(r.date_start, r.date_end, start, end);
  }
  const fleetSize = Math.max(1, uniquePlates.length);
  const util = (totalDaysRunning / (fleetSize * spanDays)) * 100;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-linear-to-br from-indigo-900 to-slate-800 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-60 font-semibold">Total Revenue</div>
            <div className="text-4xl font-bold mt-2">{fmtMoney(totalRev)}</div>
            <div className="mt-2 text-sm opacity-70">
              {period === "all"
                ? "All time"
                : period === "custom"
                ? "Custom range"
                : period === "daily"
                ? "Last 24 hours"
                : `Last ${period}`}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs opacity-60">Fleet Util.</div>
              <div className="text-lg font-semibold">{util.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Avg. Ticket</div>
              <div className="text-lg font-semibold">{rows.length > 0 ? fmtMoney(totalRev / rows.length) : "-"}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
              Revenue Trend ({period === "daily" ? "Hourly" : isMonthlyGroup ? "Monthly" : "Daily"})
            </h3>
            <span className="text-xs text-gray-400">{sortedTrends.length} points</span>
          </div>

          <div className="flex-1 flex items-end gap-1 md:gap-2 min-h-55">
            {sortedTrends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No data found</div>
            ) : (
              sortedTrends.map(([date, val], i) => {
                const h = Math.max(5, (val / maxTrend) * 100);
                const colorClass = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <div key={date} className="flex-1 group relative flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 relative ${colorClass}`}
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap z-10 pointer-events-none">
                      <span className="font-bold text-base">{fmtMoney(val)}</span>
                      <span className="opacity-80">{getTrendLabel(date, period === "daily", isMonthlyGroup)}</span>
                      <div className="w-2 h-2 bg-gray-900 rotate-45 absolute -bottom-1"></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            <span>
              {sortedTrends.length > 0 ? getTrendLabel(sortedTrends[0][0], period === "daily", isMonthlyGroup) : ""}
            </span>
            <span>
              {sortedTrends.length > 0
                ? getTrendLabel(sortedTrends[sortedTrends.length - 1][0], period === "daily", isMonthlyGroup)
                : ""}
            </span>
          </div>
        </div>
      </div>

      <FleetHealth
        cars={fleetList as any}
        agreements={overlapRows as any}
        windowStart={safeISO(start)}
        windowEnd={safeISO(end)}
      />
    </div>
  );
}
