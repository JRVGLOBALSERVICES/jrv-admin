import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { pageMetadata } from "@/lib/seo";
import NotificationControls from "./_components/NotificationControls";
import { Button } from "@/components/ui/Button";

export const metadata = pageMetadata({
  title: "Notification Logs",
  description: "Monitor sent and upcoming automated reminders.",
  path: "/admin/notifications",
});

// ... (Keep existing helper functions: fmtDate, getRelativeTime, type QueueItem) ...
function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-MY", {
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
  const gate = await requireAdmin();
  if (!gate.ok) return <div className="p-6 text-red-600">Access Denied</div>;
  if (gate.role !== "superadmin")
    return (
      <div className="p-6 text-red-600">Access Denied: Superadmin Only</div>
    );

  const supabase = await createSupabaseServer();

  // 1. Fetch Logs
  const { data: logs } = await supabase
    .from("notification_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  // 2. Fetch Active Agreements
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

  // 3. Generate Queue
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
      {/* Header with Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-gray-500">
            Monitoring 48h Notification Window
          </p>
        </div>

        {/* ✅ Insert Controls Here */}
        <NotificationControls />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ... (Keep existing Left/Right Columns exactly as before) ... */}

        {/* LEFT: SENT LOGS */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-150">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sent Log
            </h3>
            <span className="text-xs text-gray-500">Last 48 Hours</span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Car</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDate(log.sent_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          log.reminder_type === "EXPIRED"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {log.reminder_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">
                        {log.plate_number}
                      </div>
                      <div className="text-[10px] text-gray-500">
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
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-150">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-lg">📅</span>
              Upcoming Queue
            </h3>
            <span className="text-xs text-gray-500">Next 48 Hours</span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2">Scheduled For</th>
                  <th className="px-4 py-2">Alert Type</th>
                  <th className="px-4 py-2 text-right">Car</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {upcomingQueue.map((item, i) => (
                  <tr key={i} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 text-gray-600">
                      <div className="font-medium text-gray-900">
                        {fmtDate(item.scheduledFor)}
                      </div>
                      <div className="text-[10px] text-amber-600 font-semibold">
                        {getRelativeTime(item.scheduledFor)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          item.type === "EXPIRED"
                            ? "bg-red-50 border-red-100 text-red-600"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">
                        {item.plate}
                      </div>
                      <div className="text-[10px] text-gray-500">
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
