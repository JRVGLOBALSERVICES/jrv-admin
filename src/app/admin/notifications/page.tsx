// src/app/admin/notifications/page.tsx

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { pageMetadata } from "@/lib/seo";
import NotificationControls from "./_components/NotificationControls";
import { redirect } from "next/navigation";

export const metadata = pageMetadata({
  title: "Notification Logs",
  description: "Monitor sent and upcoming automated reminders.",
  path: "/admin/notifications",
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

export default async function NotificationsPage() {
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    if (gate.status === 401) redirect("/");
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {gate.message} (Superadmin Access Required)
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServer();

  // 1) Fetch Logs
  const { data: logs } = await supabase
    .from("notification_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  // 2) Fetch Active Agreements (48h window)
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

  // 3) Generate Queue
  const upcomingQueue: QueueItem[] = [];
  const checkpoints = [120, 60, 30, 10, 0];

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
              : `${
                  cp === 120
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

  upcomingQueue.sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Monitoring 48h Notification Window (MYT)
          </p>
        </div>

        <NotificationControls />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: SENT LOGS */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col h-150">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sent Log
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Last 48 Hours
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
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
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                          log.reminder_type === "EXPIRED"
                            ? "bg-red-50 border-red-100 text-red-600"
                            : "bg-blue-50 border-blue-100 text-blue-600"
                        }`}
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col h-150">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="text-lg">📅</span>
              Upcoming Queue
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Next 48 Hours
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
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
                    {/* ✅ FIXED: Now uses 'font-mono' and standard text colors to match Sent Log */}
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
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                          item.type === "EXPIRED"
                            ? "bg-red-50 border-red-100 text-red-600"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
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
