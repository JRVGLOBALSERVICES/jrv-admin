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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  // Monday start
  const x = startOfDay(d);
  const day = x.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
function startOfQuarter(d: Date) {
  const x = startOfDay(d);
  const m = x.getMonth();
  const qStart = Math.floor(m / 3) * 3;
  x.setMonth(qStart, 1);
  return x;
}
function startOfYear(d: Date) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
    .select(`
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
    `);

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

  // ✅ Sort by date_start desc, fallback updated_at desc
  rows.sort((a, b) => {
    const da = parseDate(a.date_start)?.getTime() ?? parseDate(a.updated_at)?.getTime() ?? 0;
    const db = parseDate(b.date_start)?.getTime() ?? parseDate(b.updated_at)?.getTime() ?? 0;
    return db - da;
  });

  // ===== Debug =====
  const debug = {
    total_agreements: rows.length,
    missing_date_start: rows.filter((r) => !r.date_start).length,
    missing_date_end: rows.filter((r) => !r.date_end).length,
    missing_car_id: rows.filter((r) => !r.car_id).length,
    join_missing_car: rows.filter((r) => r.car_id && !r.plate).length,
    join_missing_catalog: rows.filter((r) => r.plate && (!r.make || !r.model)).length,
  };

  const now = new Date();

  // ✅ For analytics, use date_start only
  const valid = rows.filter((r) => parseDate(r.date_start));

  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const quarterStart = startOfQuarter(now);
  const yearStart = startOfYear(now);

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

  // ✅ Active rentals now: date_start <= now <= date_end
  const active_now = rows.filter((r) => {
    const s = parseDate(r.date_start);
    const e = parseDate(r.date_end);
    if (!s || !e) return false;
    return s <= now && now <= e;
  }).length;

  // Grouped totals (based on date_start)
  const byPlate = groupSum(valid, (r) => r.plate ?? "UNKNOWN");
  const byMake = groupSum(valid, (r) => r.make ?? "UNKNOWN");
  const byModel = groupSum(valid, (r) => (r.make && r.model ? `${r.make} ${r.model}` : "UNKNOWN"));

  // Trend: last 30 days by date_start
  const last30Start = new Date(dayStart);
  last30Start.setDate(last30Start.getDate() - 29);

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(last30Start);
    d.setDate(last30Start.getDate() + i);
    trendMap.set(toKey(d), 0);
  }

  for (const r of valid) {
    const dt = parseDate(r.date_start)!;
    if (dt >= last30Start && dt <= now) {
      const k = toKey(startOfDay(dt));
      trendMap.set(k, (trendMap.get(k) ?? 0) + (Number(r.total_price) || 0));
    }
  }

  const trend = [...trendMap.entries()].map(([date, total]) => ({ date, total }));

  return NextResponse.json({
    ok: true,
    debug,
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
