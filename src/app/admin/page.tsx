import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import ExpiringSoon from "../admin/_components/ExpiringSoon";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Manage cars, pricing, images, and availability.",
  path: "/admin",
  index: false, // ✅ admin pages should not be indexed
});

type Period = "daily" | "weekly" | "monthly" | "quarterly";

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

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0 Sun
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
function getPlate(r: AgreementLite) {
  const p2 = (r.plate_number ?? "").trim();
  return p2 || "—";
}
function getCarType(r: AgreementLite) {
  return (r.car_type ?? "").trim() || "Unknown";
}

function getRange(period: Period, now = new Date()) {
  let start: Date;

  if (period === "daily") start = startOfDay(now);
  else if (period === "weekly") start = startOfWeekMonday(now);
  else if (period === "monthly") start = startOfMonth(now);
  else start = startOfQuarter(now);

  return { start, end: now };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = (sp.period as Period) || "daily";

  const { start, end } = getRange(period, new Date());

  const supabase = await createSupabaseServer();

  // ====== Revenue analytics for selected period (by date_start)
  const { data: agreements, error } = await supabase
    .from("agreements")
    .select(
      "id, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .gte("date_start", toISO(start))
    .lte("date_start", toISO(end))
    .order("car_type", { ascending: true, nullsFirst: false })
    .order("date_start", { ascending: false })
    .limit(5000);

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

  const rows = (agreements ?? []) as AgreementLite[];

  const totalRevenue = rows.reduce(
    (sum, r) => sum + (Number(r.total_price) || 0),
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

  const tabs: Array<{ key: Period; label: string }> = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
  ];

  // ====== Expiring soon (next 48 hours by default — change as you like)
  const now = new Date();
  const soonUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: expiring, error: expErr } = await supabase
    .from("agreements")
    .select(
      "id, car_type, plate_number, mobile, status, date_start, date_end, total_price"
    )
    .gte("date_end", toISO(now))
    .lte("date_end", toISO(soonUntil))
    .order("date_end", { ascending: true })
    .limit(50);

  const expiringRows = (expiring ?? []) as AgreementLite[];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="text-sm opacity-70">
            Period: <span className="font-medium">{period}</span> •{" "}
            {fmtDate(start.toISOString())} → {fmtDate(end.toISOString())}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = t.key === period;
            const href = `/admin?period=${t.key}`;
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
      </div>

      {/* KPI row */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Agreements (period)
          </div>
          <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Total Revenue (period)
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {fmtMoney(totalRevenue)}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide opacity-60">
            Top Car Type (period)
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {breakdown[0]?.car_type ?? "—"}
          </div>
          <div className="text-xs opacity-60">
            {breakdown[0]
              ? `${breakdown[0].count} agreements • ${fmtMoney(
                  breakdown[0].revenue
                )}`
              : ""}
          </div>
        </div>
      </div>

      {/* Placeholder Tracking Section */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Website & Tracking (placeholder)</div>
          <div className="text-xs opacity-60">
            Wire this to your trackers table later
          </div>
        </div>

        <div className="p-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide opacity-60">
              Website Views
            </div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs opacity-60">Total page loads</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide opacity-60">
              Traffic Split
            </div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs opacity-60">Organic vs Ads</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide opacity-60">
              WhatsApp Clicks
            </div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs opacity-60">CTA button taps</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs uppercase tracking-wide opacity-60">
              Model Clicks
            </div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs opacity-60">Car card / model taps</div>
          </div>
        </div>
      </div>

      {/* Expiring Soon with live countdown */}
      <ExpiringSoon
        title="Expiring Soon"
        subtitle="Agreements ending in the next 48 hours"
        rows={expiringRows}
        error={expErr?.message ?? null}
      />

      {/* Revenue breakdown by car_type */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Revenue by Car Type</div>
          <div className="text-xs opacity-60">Sorted A → Z</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-175 w-full text-sm">
            <thead className="bg-black/3">
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

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link className="underline" href="/admin/agreements">
          Manage Agreements
        </Link>
        <Link className="underline" href="/admin/cars">
          Manage Cars
        </Link>
        <Link className="underline" href="/admin/catalog">
          Manage Catalog
        </Link>
      </div>
    </div>
  );
}
