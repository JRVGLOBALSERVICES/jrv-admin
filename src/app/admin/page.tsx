import { createSupabaseServer } from "@/lib/supabase/server";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday start
  x.setDate(x.getDate() - day);
  return x;
}

type AgreementRow = {
  id: string;
  total_price: number | null;

  // date fields
  updated_at?: string | null;
  date_start?: string | null;
  created_at?: string | null;

  // agreement fields
  car_id?: string | null;
  number_plate?: string | null;    // may be null in your dataset
  make?: string | null;            // empty currently
  model?: string | null;           // empty currently

  // legacy fallbacks (some exports had these)
  car_type?: string | null;
};

type CarRow = {
  id: string;
  plate_number: string | null;
  catalog_id: string | null;
};

type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;
};

function cleanText(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s;
}

function cleanPlate(v: any): string | null {
  const s = cleanText(v);
  if (!s) return null;
  return s.replace(/\s+/g, " ").replace(/[<>]/g, "").toUpperCase();
}

function cleanPhone(v: any): string | null {
  const s = cleanText(v);
  if (!s) return null;
  // remove weird chars like "<"
  const fixed = s.replace(/[<>]/g, "").trim();
  // keep + and digits only
  const keep = fixed.startsWith("+")
    ? "+" + fixed.slice(1).replace(/\D/g, "")
    : fixed.replace(/\D/g, "");
  return keep || null;
}

function eventDateISO(a: AgreementRow): string | null {
  return a.updated_at ?? a.date_start ?? a.created_at ?? null;
}

function eventDateMs(a: AgreementRow): number {
  const iso = eventDateISO(a);
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer();

  // last 365 days based on updated_at/date_start/created_at
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 365);

  // Pull agreements + car_id + plate/make/model (even if empty)
  const { data: agreementsRaw, error } = await supabase
    .from("agreements")
    .select("id,total_price,updated_at,date_start,created_at,car_id,number_plate,make,model,car_type")
    .or(
      `updated_at.gte.${from.toISOString()},date_start.gte.${from.toISOString()},created_at.gte.${from.toISOString()}`
    )
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="p-4 bg-white rounded-xl border">
        <div className="font-semibold">Dashboard error</div>
        <div className="text-sm text-red-600">{error.message}</div>
      </div>
    );
  }

  const agreements = (agreementsRaw ?? []) as AgreementRow[];

  // --------------------------
  // Resolve missing plate/make/model from Cars + Catalog
  // --------------------------
  const carIds = Array.from(
    new Set(agreements.map((a) => a.car_id).filter(Boolean) as string[])
  );

  // only fetch cars if needed
  const carsMap = new Map<string, CarRow>();
  if (carIds.length) {
    const { data: cars } = await supabase
      .from("cars")
      .select("id,plate_number,catalog_id")
      .in("id", carIds);

    (cars ?? []).forEach((c: any) => carsMap.set(c.id, c));
  }

  const catalogIds = Array.from(
    new Set(
      [...carsMap.values()]
        .map((c) => c.catalog_id)
        .filter(Boolean) as string[]
    )
  );

  const catalogMap = new Map<string, CatalogRow>();
  if (catalogIds.length) {
    const { data: catalog } = await supabase
      .from("car_catalog")
      .select("id,make,model")
      .in("id", catalogIds);

    (catalog ?? []).forEach((r: any) => catalogMap.set(r.id, r));
  }

  const normalized = agreements.map((a) => {
    // plate
    const car = a.car_id ? carsMap.get(a.car_id) : undefined;
    const plate =
      cleanPlate(a.number_plate) ??
      cleanPlate(car?.plate_number) ??
      null;

    // make/model
    let make = cleanText(a.make);
    let model = cleanText(a.model);

    if ((!make || !model) && car?.catalog_id) {
      const cat = catalogMap.get(car.catalog_id);
      make = make ?? cleanText(cat?.make);
      model = model ?? cleanText(cat?.model);
    }

    // last fallback: if you only have car_type like "Toyota Vios"
    if ((!make || !model) && a.car_type) {
      const parts = String(a.car_type).trim().split(/\s+/);
      if (!make && parts.length) make = parts[0];
      if (!model && parts.length > 1) model = parts.slice(1).join(" ");
    }

    return {
      ...a,
      number_plate: plate,
      make: make ?? null,
      model: model ?? null,
      mobile: cleanPhone((a as any).mobile) ?? null,
    };
  });

  // sort by updated_at > date_start > created_at
  normalized.sort((a, b) => eventDateMs(b) - eventDateMs(a));

  const sum = (arr: AgreementRow[]) =>
    arr.reduce((acc, r) => acc + (Number(r.total_price ?? 0) || 0), 0);

  const inRange = (r: AgreementRow, start: Date) => {
    const t = eventDateMs(r);
    return t >= start.getTime();
  };

  const daily = sum(normalized.filter((r) => inRange(r, startOfDay(now))));
  const weekly = sum(normalized.filter((r) => inRange(r, startOfWeek(now))));
  const monthly = sum(normalized.filter((r) => inRange(r, startOfMonth(now))));
  const quarterly = sum(normalized.filter((r) => inRange(r, startOfQuarter(now))));
  const yearly = sum(normalized.filter((r) => inRange(r, startOfYear(now))));

  const byKey = (keyFn: (r: AgreementRow) => string) => {
    const map = new Map<string, number>();
    for (const r of normalized) {
      const k = keyFn(r);
      const v = Number(r.total_price ?? 0) || 0;
      map.set(k, (map.get(k) ?? 0) + v);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
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

  const List = ({ title, items }: { title: string; items: [string, number][] }) => (
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
          Analytics from Agreements (sorted by updated_at → date_start → created_at)
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
