import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

// ✅ Helper to format date relative to today (Force Malaysia Time)
function fmtRelative(iso: string) {
  if (!iso) return "—";

  const date = new Date(iso);
  const now = new Date();

  // Calculate difference in hours
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Format Time: "10:30 PM"
  const timeStr = date.toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Format Day: "Dec 29"
  const dateStr = date.toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    month: "short",
    day: "numeric",
  });

  if (diffHours < 0) {
    // Overdue (Negative difference)
    return <span className="text-red-600 font-bold">Overdue ({timeStr})</span>;
  }

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    // Same day
    return <span className="text-amber-600 font-bold">Today, {timeStr}</span>;
  }

  if (diffHours < 48 && date.getDate() === now.getDate() + 1) {
    // Tomorrow
    return (
      <span className="text-blue-600 font-medium">Tomorrow, {timeStr}</span>
    );
  }

  // Later dates
  return (
    <span className="text-gray-600">
      {dateStr}, {timeStr}
    </span>
  );
}

export default async function AdminDashboard() {
  // 1. Check Permissions
  await requireAdmin();
  const supabase = await createSupabaseServer();

  // 2. Fetch Stats (Active Rentals, Total Cars)
  const { count: activeCount } = await supabase
    .from("agreements")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  const { count: totalCars } = await supabase
    .from("cars")
    .select("*", { count: "exact", head: true })
    .neq("status", "sold");

  // 3. Calculate Revenue (Current Month)
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const { data: revenueData } = await supabase
    .from("agreements")
    .select("total_price")
    .gte("created_at", startOfMonth)
    .neq("status", "Cancelled")
    .neq("status", "Deleted"); // Exclude deleted

  const revenue =
    revenueData?.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0) || 0;

  // 4. Fetch "Returns Due Soon" (Next 72 Hours)
  // We look for Active agreements ending soon
  const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

  const { data: expiring } = await supabase
    .from("agreements")
    .select("id, plate_number, car_type, customer_name, date_end, status")
    .eq("status", "Active")
    .lte("date_end", in72h) // End date is before 72h from now
    .order("date_end", { ascending: true }) // Earliest first
    .limit(10);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Rentals Card */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Active Rentals
          </div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {activeCount || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Currently on the road
          </div>
        </div>

        {/* Fleet Utilization Card */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Fleet Utilization
          </div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {totalCars ? Math.round(((activeCount || 0) / totalCars) * 100) : 0}
            %
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {activeCount} of {totalCars} cars rented
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Revenue (Month)
          </div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            RM {revenue.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            From {revenueData?.length || 0} bookings
          </div>
        </div>
      </div>

      {/* Expiring Soon Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Returns Due Soon</h3>
          <Link
            href="/admin/agreements?status=Active"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            View All Active
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Car Info</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Return Time</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expiring?.map((ag) => (
                <tr key={ag.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">
                      {ag.plate_number}
                    </div>
                    <div className="text-xs text-gray-500">{ag.car_type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {ag.customer_name}
                  </td>
                  <td className="px-4 py-3">
                    {/* Time Formatter Applied Here */}
                    {fmtRelative(ag.date_end)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/agreements/${ag.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Manage
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}

              {(!expiring || expiring.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No returns due in the next 3 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
