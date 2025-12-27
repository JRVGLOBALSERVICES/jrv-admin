import { createSupabaseServer } from "@/lib/supabase/server";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfWeek(d: Date) {
  // Monday-based
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

type AgreementRow = {
  total_price: number | null;
  date_start: string | null;
  number_plate: string | null;
  make: string | null;
  model: string | null;
};

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer();

  // Keep it simple: fetch recent 365 days for dashboard
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 365);

  const { data: agreements, error } = await supabase
    .from("agreements")
    .select("total_price,date_start,number_plate,make,model")
    .gte("date_start", from.toISOString())
    .order("date_start", { ascending: false });

  if (error) {
    return (
      <div className="p-4 bg-white rounded-xl border">
        <div className="font-semibold">Dashboard error</div>
        <div className="text-sm text-red-600">{error.message}</div>
      </div>
    );
  }

  const rows = (agreements ?? []) as AgreementRow[];

  const sum = (arr: AgreementRow[]) =>
    arr.reduce((acc, r) => acc + (Number(r.total_price ?? 0) || 0), 0);

  const inRange = (r: AgreementRow, start: Date) => {
    const t = r.date_start ? new Date(r.date_start).getTime() : 0;
    return t >= start.getTime();
  };

  const daily = sum(rows.filter((r) => inRange(r, startOfDay(now))));
  const weekly = sum(rows.filter((r) => inRange(r, startOfWeek(now))));
  const monthly = sum(rows.filter((r) => inRange(r, startOfMonth(now))));
  const quarterly = sum(rows.filter((r) => inRange(r, startOfQuarter(now))));
  const yearly = sum(rows.filter((r) => inRange(r, startOfYear(now))));

  const byKey = (keyFn: (r: AgreementRow) => string) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const k = keyFn(r);
      const v = Number(r.total_price ?? 0) || 0;
      map.set(k, (map.get(k) ?? 0) + v);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  };

  const topPlates = byKey((r) => r.number_plate?.trim() || "Unknown plate");
  const topMakes = byKey((r) => r.make?.trim() || "Unknown make");
  const topModels = byKey((r) => r.model?.trim() || "Unknown model");

  const Card = ({ title, value }: { title: string; value: number }) => (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm opacity-60">{title}</div>
      <div className="text-2xl font-semibold">RM {value.toLocaleString()}</div>
    </div>
  );

  const List = ({
    title,
    items,
  }: {
    title: string;
    items: [string, number][];
  }) => (
    <div className="rounded-xl border bg-white p-4">
      <div className="font-semibold mb-3">{title}</div>
      <div className="space-y-2 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <div className="truncate">{k}</div>
            <div className="font-medium">RM {v.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">Dashboard</div>
        <div className="text-sm opacity-60">
          Sales analytics from Agreements (last 365 days)
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card title="Today" value={daily} />
        <Card title="This week" value={weekly} />
        <Card title="This month" value={monthly} />
        <Card title="This quarter" value={quarterly} />
        <Card title="This year" value={yearly} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <List title="Top Plates" items={topPlates} />
        <List title="Top Makes" items={topMakes} />
        <List title="Top Models" items={topModels} />
      </div>
    </div>
  );
}
