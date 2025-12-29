import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import ExpiringSoon from "../admin/_components/ExpiringSoon";
import AvailableNow from "../admin/_components/AvailableNow";
import AvailableTomorrow from "../admin/_components/AvailableTomorrow";
import CurrentlyRented from "../admin/_components/CurrentlyRented";
import DashboardFilters from "../admin/_components/DashboardFilters";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "JRV Admin Overview",
  path: "/admin",
  index: false,
});

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all"
  | "custom";

type AgreementLite = {
  id: string;
  customer_name?: string | null;
  car_type: string | null;
  plate_number: string | null;
  mobile: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
};

// --- Date Helpers ---
function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}
function safeISO(d: Date) {
  return isValidDate(d) ? d.toISOString() : new Date().toISOString();
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
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
function fmtMoney(v?: number | null) {
  return `RM ${Number(v ?? 0).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
function diffDays(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

// --- Model normalization ---
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
function getBrand(model: string) {
  return model.split(" ")[0] || "Other";
}

// ✅ daily = last 24 hours (yesterday this time → today this time)
function getRange(
  period: Period,
  fromParam: string,
  toParam: string,
  now = new Date()
) {
  if (period === "custom" && fromParam && toParam) {
    const s = new Date(fromParam);
    const e = new Date(toParam);
    if (isValidDate(s) && isValidDate(e)) {
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }

  let start: Date;
  if (period === "all") return { start: new Date(0), end: now };

  if (period === "daily") start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  else if (period === "weekly") start = startOfWeekMonday(now);
  else if (period === "monthly") start = startOfMonth(now);
  else if (period === "quarterly") start = startOfQuarter(now);
  else if (period === "yearly") start = startOfYear(now);
  else start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return { start, end: now };
}

// ✅ Supabase relation can be object OR array depending on typing/join shape
function pickCatalog(rel: any): { make?: any; model?: any } {
  if (!rel) return {};
  if (Array.isArray(rel)) return rel[0] ?? {};
  return rel;
}

/* ===========================
   ✅ KL TIMEZONE HELPERS
   Fixes Vercel UTC "today/tomorrow" shifting
   =========================== */

const KL_TZ = "Asia/Kuala_Lumpur";
const KL_OFFSET_MS = 8 * 60 * 60 * 1000; // Malaysia is UTC+8, no DST

function startOfDayInKLToUTC(baseUtc: Date) {
  // Convert "now UTC" into KL local clock, then clamp to 00:00 KL, then convert back to UTC instant.
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  const klMidnight = new Date(
    kl.getFullYear(),
    kl.getMonth(),
    kl.getDate(),
    0,
    0,
    0,
    0
  );
  return new Date(klMidnight.getTime() - KL_OFFSET_MS);
}

function endOfDayInKLToUTC(baseUtc: Date) {
  const start = startOfDayInKLToUTC(baseUtc);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function addDaysKL(baseUtc: Date, days: number) {
  // Move KL day forward, then return the UTC instant corresponding to the same KL clock time.
  const kl = new Date(baseUtc.getTime() + KL_OFFSET_MS);
  kl.setDate(kl.getDate() + days);
  return new Date(kl.getTime() - KL_OFFSET_MS);
}

export default async function AdminDashboard({
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
  const period = (sp.period as Period) || "daily";
  const filterModel = sp.model || "";
  const filterPlate = sp.plate || "";
  const fromParam = sp.from || "";
  const toParam = sp.to || "";

  const { start, end } = getRange(period, fromParam, toParam, new Date());
  const supabase = await createSupabaseServer();

  // Filters dropdown data (based on agreements history)
  const { data: allAgreements } = await supabase
    .from("agreements")
    .select("car_type, plate_number")
    .limit(3000);

  const uniqueModels = Array.from(
    new Set(
      (allAgreements ?? [])
        .map((a) => normalizeModel(a.car_type))
        .filter(Boolean)
    )
  ) as string[];
  const uniquePlates = Array.from(
    new Set((allAgreements ?? []).map((a) => a.plate_number).filter(Boolean))
  ) as string[];

  uniqueModels.sort();
  uniquePlates.sort();

  // Revenue query
  let query = supabase
    .from("agreements")
    .select(
      "id, customer_name, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .neq("status", "Cancelled")
    .neq("status", "Deleted")
    .order("date_start", { ascending: false });

  if (period !== "all") {
    query = query
      .gte("date_start", safeISO(start))
      .lte("date_start", safeISO(end));
  }
  if (filterPlate) query = query.eq("plate_number", filterPlate);

  const { data: revenueData, error } = await query.limit(5000);
  if (error)
    return <div className="p-6 text-red-600">Error: {error.message}</div>;

  let rows = (revenueData ?? []) as AgreementLite[];
  if (filterModel)
    rows = rows.filter((r) => normalizeModel(r.car_type) === filterModel);

  // Analytics
  let totalRevenue = 0;
  let totalDaysRented = 0;

  const byModel = new Map<
    string,
    { count: number; revenue: number; days: number }
  >();
  const byPlate = new Map<
    string,
    { count: number; revenue: number; model: string }
  >();
  const byBrand = new Map<string, { revenue: number }>();

  for (const r of rows) {
    const rev = Number(r.total_price) || 0;
    const days = diffDays(r.date_start, r.date_end);
    const model = normalizeModel(r.car_type);
    const brand = getBrand(model);
    const plate = r.plate_number || "Unknown";

    totalRevenue += rev;
    totalDaysRented += days;

    const m = byModel.get(model) || { count: 0, revenue: 0, days: 0 };
    m.count += 1;
    m.revenue += rev;
    m.days += days;
    byModel.set(model, m);

    const p = byPlate.get(plate) || { count: 0, revenue: 0, model };
    p.count += 1;
    p.revenue += rev;
    byPlate.set(plate, p);

    const b = byBrand.get(brand) || { revenue: 0 };
    b.revenue += rev;
    byBrand.set(brand, b);
  }

  const breakdownModel = Array.from(byModel.entries())
    .map(([k, v]) => ({ key: k, ...v, adr: v.revenue / (v.days || 1) }))
    .sort((a, b) => b.revenue - a.revenue);

  const breakdownPlate = Array.from(byPlate.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const breakdownBrand = Array.from(byBrand.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const bookingCount = rows.length;
  const avgDailyRate = totalDaysRented > 0 ? totalRevenue / totalDaysRented : 0;
  const avgLength = bookingCount > 0 ? totalDaysRented / bookingCount : 0;
  const maxModelRev = breakdownModel[0]?.revenue || 1;

  // ---- Cards data ----
  const now = new Date();

  // ✅ FIXED: KL "today" boundaries in UTC instants
  const todayStartUTC = startOfDayInKLToUTC(now);
  const todayEndUTC = endOfDayInKLToUTC(now);

  // Expiring today (ALL) — based on KL day
  const { data: expiringToday } = await supabase
    .from("agreements")
    .select(
      "id, customer_name, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .gte("date_end", todayStartUTC.toISOString())
    .lte("date_end", todayEndUTC.toISOString())
    .order("date_end", { ascending: true })
    .limit(5000);

  // Cars base (IMPORTANT: alias catalog_rel)
  const { data: carsBase } = await supabase
    .from("cars")
    .select(
      "id, plate_number, status, location, catalog_rel:catalog_id ( make, model )"
    )
    .order("plate_number", { ascending: true })
    .limit(5000);

  // Active agreements right now => currently rented
  const nowIso = now.toISOString();
  const { data: activeNow } = await supabase
    .from("agreements")
    .select(
      "id, customer_name, mobile, car_id, plate_number, car_type, date_start, date_end, status"
    )
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .lte("date_start", nowIso)
    .gt("date_end", nowIso)
    .not("car_id", "is", null)
    .order("date_end", { ascending: true })
    .limit(5000);

  const busyCarIds = new Set(
    (activeNow ?? []).map((a: any) => a?.car_id).filter(Boolean)
  );

  // Available now = car.status available AND not currently busy
  const availableNowRows =
    (carsBase ?? [])
      .filter(
        (c: any) => c?.status === "available" && c?.id && !busyCarIds.has(c.id)
      )
      .map((c: any) => {
        const cat = pickCatalog(c?.catalog_rel);
        const make = String(cat?.make ?? "").trim();
        const model = String(cat?.model ?? "").trim();
        return {
          id: c.id,
          plate_number: c.plate_number,
          location: c.location,
          car_label: [make, model].filter(Boolean).join(" ").trim(),
        };
      }) ?? [];

  // Currently rented rows (join car label)
  const currentlyRentedRows =
    (activeNow ?? []).map((ag: any) => {
      const car = (carsBase ?? []).find((c: any) => c?.id === ag.car_id);
      const cat = pickCatalog(car?.catalog_rel);
      const make = String(cat?.make ?? "").trim();
      const model = String(cat?.model ?? "").trim();

      return {
        agreement_id: ag.id,
        car_id: ag.car_id,
        plate_number: ag.plate_number || car?.plate_number || "—",
        car_label:
          ag.car_type || [make, model].filter(Boolean).join(" ").trim() || "—",
        customer_name: ag.customer_name ?? null,
        mobile: ag.mobile ?? null,
        date_end: ag.date_end ?? null,
        status: ag.status ?? null,
      };
    }) ?? [];

  // ✅ FIXED: Tomorrow KL boundaries
  const tomorrowBase = addDaysKL(now, 1);
  const tomorrowStartUTC = startOfDayInKLToUTC(tomorrowBase);
  const tomorrowEndUTC = endOfDayInKLToUTC(tomorrowBase);

  // Available tomorrow = ONLY currently rented now AND end tomorrow (KL day)
  const availableTomorrowRows = (currentlyRentedRows ?? []).filter((r: any) => {
    const endT = r?.date_end ? new Date(r.date_end).getTime() : NaN;
    return (
      Number.isFinite(endT) &&
      endT >= tomorrowStartUTC.getTime() &&
      endT <= tomorrowEndUTC.getTime()
    );
  });

  const availableCount = availableNowRows.length;
  const rentedCount = currentlyRentedRows.length;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-500 font-medium">
            {period === "all"
              ? "All Time"
              : period === "custom"
              ? "Custom Range"
              : `This ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-20 bg-white rounded-xl border animate-pulse" />
          }
        >
          <DashboardFilters plates={uniquePlates} models={uniqueModels} />
        </Suspense>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Revenue
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {fmtMoney(totalRevenue)}
          </div>
          <div className="text-xs text-green-600 mt-1 font-medium">
            {bookingCount} bookings
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Days Rented
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {totalDaysRented}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">
            days total
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Avg Daily Rate
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {fmtMoney(avgDailyRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">per day</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase">
            Avg Length
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {avgLength.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">
            days / trip
          </div>
        </div>
      </div>

      {/* ✅ ROW 1: 3 cards side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ExpiringSoon
          title="Expiring Today ⏳"
          subtitle="All agreements ending today"
          rows={(expiringToday ?? []) as any}
        />

        <AvailableNow
          title="Available Now ✅"
          rows={availableNowRows as any}
          availableCount={availableCount}
          rentedCount={rentedCount}
        />

        <AvailableTomorrow
          title="Available Tomorrow 📅"
          rows={availableTomorrowRows as any}
        />
      </div>

      {/* ✅ ROW 2: Currently rented full width */}
      <div className="grid grid-cols-1">
        <CurrentlyRented
          title="Currently Rented 🚗"
          rows={currentlyRentedRows as any}
          availableCount={availableCount}
          rentedCount={rentedCount}
        />
      </div>

      {/* ✅ Bottom: top plate + revenue by model */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Top Performing Cars</h3>
            <span className="text-xs bg-black text-white px-2 py-1 rounded">
              By Plate
            </span>
          </div>
          <div className="divide-y">
            {breakdownPlate.map((p, i) => (
              <div
                key={p.key}
                className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">{p.key}</div>
                    <div className="text-xs text-gray-500">{p.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">
                    {fmtMoney(p.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">{p.count} trips</div>
                </div>
              </div>
            ))}
            {breakdownPlate.length === 0 && (
              <div className="p-6 text-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-3">
            {breakdownBrand.map((b) => (
              <div
                key={b.key}
                className="bg-white border shadow-sm rounded-lg px-4 py-2 flex items-center gap-3"
              >
                <span className="font-semibold text-gray-700">{b.key}</span>
                <div className="h-4 w-px bg-gray-200"></div>
                <span className="text-emerald-600 font-bold">
                  {fmtMoney(b.revenue)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Revenue by Model</h3>
              <div className="text-xs text-gray-500">Includes ADR</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 w-1/3">Model</th>
                    <th className="px-4 py-3 text-right">Performance</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Trips</th>
                    <th className="px-4 py-3 text-right">ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {breakdownModel.map((b) => {
                    const percent = (b.revenue / maxModelRev) * 100;
                    return (
                      <tr key={b.key} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {b.key}
                        </td>
                        <td className="px-4 py-3 w-1/4 align-middle">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {fmtMoney(b.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {b.count}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 font-medium bg-gray-50/50">
                          {fmtMoney(b.adr)}
                        </td>
                      </tr>
                    );
                  })}

                  {breakdownModel.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
