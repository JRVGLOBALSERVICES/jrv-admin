import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

type Period = "daily" | "weekly" | "monthly" | "quarterly";

type Row = {
  id: string;
  car_type: string | null;
  number_plate: string | null;
  // plate_number: string | null; // if you also have it
  mobile: string | null;
  total_price: number | null;
  deposit_price: number | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0 Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
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
function toISO(d: Date) {
  return d.toISOString();
}
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return `RM ${Number(v).toLocaleString("en-MY")}`;
}
function getPlate(r: Row) {
  const a = (r.number_plate ?? "").trim();
  // const b = (r.plate_number ?? "").trim();
  return a || "—";
}
function getCarType(r: Row) {
  return (r.car_type ?? "").trim() || "Unknown";
}
function getRange(period: Period, now = new Date()) {
  const end = new Date(now); // inclusive-ish; we’ll use lt end+1 for day
  let start: Date;

  if (period === "daily") start = startOfDay(now);
  else if (period === "weekly") start = startOfWeekMonday(now);
  else if (period === "monthly") start = startOfMonth(now);
  else start = startOfQuarter(now);

  // End boundary: now (works fine for live dashboard)
  return { start, end };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const period = (sp.period as Period) || "monthly";
  const q = (sp.q ?? "").trim().toLowerCase();

  const { start, end } = getRange(period, new Date());

  const supabase = await createSupabaseServer();

  // Pull agreements for the range based on date_start (you requested)
  let query = supabase
    .from("agreements")
    .select(
      "id, car_type, number_plate, mobile, total_price, deposit_price, status, date_start, date_end, created_at, updated_at"
    )
    .gte("date_start", toISO(start))
    .lte("date_start", toISO(end));

  // optional search by car_type / plate
  if (q) {
    // OR filter
    query = query.or(`car_type.ilike.%${q}%,number_plate.ilike.%${q}%`);
  }

  // sort by car_type, then latest start date
  const { data, error } = await query
    .order("car_type", { ascending: true, nullsFirst: false })
    .order("date_start", { ascending: false })
    .limit(2000);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Dashboard</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {error.message}
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as Row[];

  // aggregate
  const totalRevenue = rows.reduce(
    (sum, r) => sum + (Number(r.total_price) || 0),
    0
  );
  const totalDeposit = rows.reduce(
    (sum, r) => sum + (Number(r.deposit_price) || 0),
    0
  );

  const byCarType = new Map<string, { count: number; revenue: number }>();
  for (const r of rows) {
    const key = getCarType(r);
    const prev = byCarType.get(key) || { count: 0, revenue: 0 };
    prev.count += 1;
    prev.revenue += Number(r.total_price) || 0;
    byCarType.set(key, prev);
  }

  const breakdown = Array.from(byCarType.entries())
    .map(([car_type, v]) => ({ car_type, ...v }))
    .sort((a, b) => a.car_type.localeCompare(b.car_type));

  const periodLabel =
    period === "daily"
      ? "Today"
      : period === "weekly"
      ? "This week"
      : period === "monthly"
      ? "This month"
      : "This quarter";

  const tabs: Array<{ key: Period; label: string }> = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="text-sm opacity-70">
            {periodLabel} • {fmtDate(start.toISOString())} →{" "}
            {fmtDate(end.toISOString())}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <form
            className="flex items-center gap-2"
            action="/admin"
            method="get"
          >
            <input type="hidden" name="period" value={period} />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search car type / plate…"
              className="h-10 w-full md:w-72 rounded-lg border px-3 text-sm"
            />
            <button className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 active:scale-[0.98]">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.key === period;
          const href = `/admin?period=${t.key}${
            q ? `&q=${encodeURIComponent(q)}` : ""
          }`;
          return (
            <Link
              key={t.key}
              href={href}
              className={[
                "h-9 inline-flex items-center rounded-lg border px-3 text-sm transition",
                active
                  ? "bg-black text-white border-black"
                  : "bg-white hover:bg-black/5 active:bg-black/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Agreements
          </div>
          <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Total Revenue
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {fmtMoney(totalRevenue)}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Total Deposit
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {fmtMoney(totalDeposit)}
          </div>
        </div>
      </div>

      {/* Breakdown by car_type */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">By Car Type</div>
          <div className="text-xs opacity-60">{breakdown.length} types</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left">
                <th className="p-3">Car Type</th>
                <th className="p-3">Count</th>
                <th className="p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.car_type} className="border-t">
                  <td className="p-3 font-medium">{b.car_type}</td>
                  <td className="p-3">{b.count}</td>
                  <td className="p-3">{fmtMoney(b.revenue)}</td>
                </tr>
              ))}
              {!breakdown.length ? (
                <tr>
                  <td colSpan={3} className="p-6 opacity-60">
                    No data in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agreements list */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Agreements</div>
          <Link className="text-sm underline" href="/admin/agreements">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left">
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Plate</th>
                <th className="p-3">Car Type</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{fmtDate(r.date_start)}</td>
                  <td className="p-3">{fmtDate(r.date_end)}</td>
                  <td className="p-3 font-medium">{getPlate(r)}</td>
                  <td className="p-3">{getCarType(r)}</td>
                  <td className="p-3">{r.mobile ?? "—"}</td>
                  <td className="p-3">{fmtMoney(r.total_price)}</td>
                  <td className="p-3">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {r.status ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="p-6 opacity-60">
                    No agreements found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {rows.length > 200 ? (
          <div className="px-4 py-3 border-t text-xs opacity-60">
            Showing first 200 agreements for performance.
          </div>
        ) : null}
      </div>
    </div>
  );
}
