import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { pageMetadata } from "@/lib/seo";
import NotificationControls from "./_components/NotificationControls";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export const metadata = pageMetadata({
  title: "Notification Logs",
  description: "Monitor sent and upcoming automated reminders.",
  path: "/admin/notifications",
  index: false, // ✅ Admin pages should not be indexed
});

const APP_TZ = "Asia/Kuala_Lumpur";

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-MY", {
    timeZone: APP_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getRelativeTime(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  const mins = Math.ceil(diff / 60000);
  const hours = Math.ceil(mins / 60);
  if (mins < 0) return "Overdue";
  if (mins < 60) return `in ${mins} mins`;
  return `in ${hours} hours`;
}

type QueueItem = {
  plate: string | null;
  model: string | null;
  type: string;
  scheduledFor: string;
  originalEnd: string | null;
};

function getBadgeColor(type: string) {
  const t = type.toUpperCase();
  if (t.includes("EXPIRED") || t.includes("OVERDUE")) {
    return "bg-red-50 border-red-100 text-red-600";
  }
  if (t.includes("MAINTENANCE")) {
    return "bg-rose-50 border-rose-100 text-rose-600";
  }
  if (t.includes("INSURANCE") || t.includes("ROADTAX")) {
    return "bg-amber-50 border-amber-100 text-amber-600";
  }
  // Agreement Reminders (e.g. "2 Hours", "1 Hour", etc.)
  return "bg-blue-50 border-blue-100 text-blue-600";
}

export default async function NotificationsPage() {
  const supabase = await createSupabaseServer();

  // 1. Session Check: Redirect to root if not logged in
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
  }

  // 2. Superadmin Gate: Redirect to dashboard if not superadmin
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    redirect("/admin");
  }

  // 3) Fetch Logs
  const { data: logs } = await supabase
    .from("notification_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  // 4) Fetch Active Agreements (48h window)
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: activeAgreements } = await supabase
    .from("agreements")
    .select("id, plate_number, car_type, date_end")
    .neq("status", "Cancelled")
    .neq("status", "Completed")
    .gt("date_end", now.toISOString())
    .lte("date_end", in48h.toISOString())
    .order("date_end", { ascending: true });

  // 5) Generate Queue logic
  const upcomingQueue: QueueItem[] = [];
  const checkpoints = [120, 60, 30, 10, 0];

  // A. Rent-Ended Checkpoints
  for (const ag of activeAgreements || []) {
    const endMs = new Date(ag.date_end).getTime();
    const nowMs = now.getTime();
    const minsUntilEnd = (endMs - nowMs) / 60000;

    checkpoints.forEach((cp) => {
      if (minsUntilEnd > cp) {
        const triggerTimeMs = endMs - cp * 60000;
        upcomingQueue.push({
          plate: ag.plate_number,
          model: ag.car_type,
          type:
            cp === 0
              ? "EXPIRED"
              : `${cp === 120
                ? "2 Hours"
                : cp === 60
                  ? "1 Hour"
                  : cp + " Minutes"
              }`,
          scheduledFor: new Date(triggerTimeMs).toISOString(),
          originalEnd: ag.date_end,
        });
      }
    });
  }

  // B. Insurance & Roadtax & Maintenance Checkpoints
  const { data: allCars } = await supabase
    .from("cars")
    .select("id, plate_number, current_mileage, next_service_mileage, insurance_expiry, roadtax_expiry, catalog:catalog_id(make, model)")
    .neq("status", "Deleted");

  const tomorrow8am = new Date();
  tomorrow8am.setDate(tomorrow8am.getDate() + 1);
  tomorrow8am.setHours(8, 0, 0, 0);

  const nextCronTime = tomorrow8am.toISOString();

  allCars?.forEach((car: any) => {
    const model = `${car.catalog?.make} ${car.catalog?.model}`;

    // 1. Maintenance (If due, it triggers at next 8am)
    if (car.next_service_mileage && car.current_mileage) {
      const dist = car.next_service_mileage - car.current_mileage;

      if (dist <= 2000) {
        let type = "MAINTENANCE (< 2000km)";
        if (dist <= 0) type = "MAINTENANCE OVERDUE";
        else if (dist <= 100) type = "MAINTENANCE (Urgent 100km)";
        else if (dist <= 500) type = "MAINTENANCE (< 500km)";
        else if (dist <= 1000) type = "MAINTENANCE (< 1000km)";

        upcomingQueue.push({
          plate: car.plate_number,
          model: model,
          type: type,
          scheduledFor: nextCronTime,
          originalEnd: null
        });
      }
    }

    // 2. Insurance / Roadtax (30 days, 7 days, 1 day before)
    // 2. Insurance / Roadtax (Cron checks daily for anything <= 90 days)
    // We expect these to be sent at the next Cron run (Tomorrow 8am)
    const checkExpiry = (dateStr: string | null, label: string) => {
      if (!dateStr) return;
      const expiry = new Date(dateStr);
      const diffMs = expiry.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // If within 90 days window (including expired), Cron will pick it up
      if (days <= 90) {
        let info = "";
        if (days < 0) info = "EXPIRED";
        else if (days === 0) info = "Today";
        else info = `${days} Days`;

        upcomingQueue.push({
          plate: car.plate_number,
          model: model,
          type: `${label} (${info})`,
          scheduledFor: nextCronTime,
          originalEnd: dateStr
        });
      }
    };

    checkExpiry(car.insurance_expiry, "INSURANCE");
    checkExpiry(car.roadtax_expiry, "ROADTAX");
  });

  upcomingQueue.sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-4xl italic font-mono font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} /> Notification
            Center
          </div>
          <div className="text-sm text-gray-500">
            Monitoring 48h Notification Window (MYT)
          </div>
        </div>

        <NotificationControls />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: SENT LOGS */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col md:h-210 h-150">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sent Log
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Recent Activity
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Car</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs?.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs font-mono">
                      {fmtDate(log.sent_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getBadgeColor(log.reminder_type)}`}
                      >
                        {log.reminder_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-gray-900 text-xs">
                        {log.plate_number}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {log.car_model}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: UPCOMING QUEUE */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col md:h-210 h-150">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="text-lg">📅</span>
              Upcoming Queue
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Next 48 Hours
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Scheduled For</th>
                  <th className="px-4 py-3">Alert Type</th>
                  <th className="px-4 py-3 text-right">Car</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcomingQueue.map((item, i) => (
                  <tr
                    key={i}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-gray-600 whitespace-nowrap text-xs font-mono">
                        {fmtDate(item.scheduledFor)}
                      </div>
                      <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mt-0.5">
                        {getRelativeTime(item.scheduledFor)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getBadgeColor(item.type)}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="font-bold text-gray-900 text-xs">
                        {item.plate}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {item.model}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
