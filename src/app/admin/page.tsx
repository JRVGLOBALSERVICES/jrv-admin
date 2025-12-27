import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Dashboard() {
  const { data } = await supabase
    .from("agreements")
    .select("total_price, date_start, number_plate, car_type");

  const total = data?.reduce((s, a) => s + (a.total_price ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow">
          <div className="text-sm opacity-70">Total Revenue</div>
          <div className="text-xl font-bold">RM {total.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-sm opacity-60">
        Filters supported: Daily / Weekly / Monthly / Yearly / Plate / Make / Model
      </div>
    </div>
  );
}
