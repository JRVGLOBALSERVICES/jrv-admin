import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type Row = {
  id: string;
  date_start: string | null;
  date_end: string | null;
  updated_at: string | null;
  total_price: number;
  status: string | null;
  car_id: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
};

// --- KL Timezone Helpers (UTC+8) ---
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

function toKL(date: Date) {
  return new Date(date.getTime() + KL_OFFSET_MS);
}

function startOfDayKL(now: Date) {
  const kl = toKL(now);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  const d = kl.getUTCDate();
  // Return UTC timestamp representing 00:00 KL time
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KL_OFFSET_MS);
}

function startOfWeekKL(now: Date) {
  const kl = toKL(now);
  const day = kl.getUTCDay(); // 0=Sun, 1=Mon
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const monday = new Date(kl);
  monday.setUTCDate(kl.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - KL_OFFSET_MS);
}

function startOfMonthKL(now: Date) {
  const kl = toKL(now);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - KL_OFFSET_MS);
}

function startOfQuarterKL(now: Date) {
  const kl = toKL(now);
  const y = kl.getUTCFullYear();
  const m = kl.getUTCMonth();
  const qStart = Math.floor(m / 3) * 3;
  return new Date(Date.UTC(y, qStart, 1, 0, 0, 0, 0) - KL_OFFSET_MS);
}

function startOfYearKL(now: Date) {
  const kl = toKL(now);
  const y = kl.getUTCFullYear();
  return new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0) - KL_OFFSET_MS);
}

// Group key based on KL date
function toKeyKL(d: Date) {
  const kl = toKL(d);
  const y = kl.getUTCFullYear();
  const m = String(kl.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kl.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupSum(rows: Row[], keyFn: (r: Row) => string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    const v = Number(r.total_price || 0);
    map.set(k, (map.get(k) ?? 0) + v);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("agreements")
    .select(
      `
      id,
      date_start,
      date_end,
      updated_at,
      total_price,
      status,
      car_id,
      cars:car_id (
        id,
        plate_number,
        catalog:catalog_id (
          make,
          model
        )
      )
    `
    )
    .neq("status", "Cancelled")
    .neq("status", "Deleted"); // Exclude cancelled from totals

  if (error) return jsonError(error.message, 500);

  const rows: Row[] =
    (data ?? []).map((a: any) => {
      const car = a.cars ?? null;
      const cat = car?.catalog ?? null;

      return {
        id: a.id,
        date_start: a.date_start ?? null,
        date_end: a.date_end ?? null,
        updated_at: a.updated_at ?? null,
        total_price: Number(a.total_price ?? 0),
        status: a.status ?? null,
        car_id: a.car_id ?? null,
        plate: car?.plate_number ?? null,
        make: cat?.make ?? null,
        model: cat?.model ?? null,
      };
    }) ?? [];

  // Sort by date_start desc
  rows.sort((a, b) => {
    const da = parseDate(a.date_start)?.getTime() ?? 0;
    const db = parseDate(b.date_start)?.getTime() ?? 0;
    return db - da;
  });

  const now = new Date();

  // Valid rows for revenue calc (must have start date)
  const valid = rows.filter((r) => parseDate(r.date_start));

  // Time boundaries (KL Time)
  const dayStart = startOfDayKL(now);
  const weekStart = startOfWeekKL(now);
  const monthStart = startOfMonthKL(now);
  const quarterStart = startOfQuarterKL(now);
  const yearStart = startOfYearKL(now);

  const sumSince = (since: Date) =>
    valid
      .filter((r) => (parseDate(r.date_start) as Date) >= since)
      .reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);

  const totals = {
    daily: sumSince(dayStart),
    weekly: sumSince(weekStart),
    monthly: sumSince(monthStart),
    quarterly: sumSince(quarterStart),
    yearly: sumSince(yearStart),
    all_time: valid.reduce((acc, r) => acc + (Number(r.total_price) || 0), 0),
  };

  // Active rentals now: date_start <= now <= date_end
  const active_now = rows.filter((r) => {
    const s = parseDate(r.date_start);
    const e = parseDate(r.date_end);
    if (!s || !e) return false;
    return s <= now && now <= e;
  }).length;

  // Grouped totals (Booked Revenue)
  const byPlate = groupSum(valid, (r) => r.plate ?? "UNKNOWN");
  const byMake = groupSum(valid, (r) => r.make ?? "UNKNOWN");
  const byModel = groupSum(valid, (r) =>
    r.make && r.model ? `${r.make} ${r.model}` : "UNKNOWN"
  );

  // Trend: last 30 days by date_start (KL Time buckets)
  // We want to show the last 30 "KL days"
  const trendMap = new Map<string, number>();

  // Initialize last 30 days with 0
  const todayKL = startOfDayKL(now);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayKL);
    d.setDate(d.getDate() - i); // Subtract days from KL midnight
    trendMap.set(toKeyKL(d), 0);
  }

  // Populate data
  for (const r of valid) {
    const dt = parseDate(r.date_start)!;
    // Check if within last 30 days window
    const diffTime = now.getTime() - dt.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays <= 31 && diffDays >= -1) {
      const k = toKeyKL(dt);
      if (trendMap.has(k)) {
        trendMap.set(k, (trendMap.get(k) ?? 0) + r.total_price);
      }
    }
  }

  const trend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date, total }));

  return NextResponse.json({
    ok: true,
    totals,
    active_now,
    top: {
      byPlate: byPlate.slice(0, 20),
      byMake: byMake.slice(0, 20),
      byModel: byModel.slice(0, 20),
    },
    trend,
  });
}
