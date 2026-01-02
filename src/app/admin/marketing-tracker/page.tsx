import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import MarketingTrackerClient from "./_components/MarketingTrackerClient";
import { ShieldAlert } from "lucide-react";

export default async function MarketingTrackerPage({ searchParams }: { searchParams: Promise<any> }) {
  const supabase = await createSupabaseServer();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");
  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/dashboard");

  const sp = await searchParams;
  const { data: logs, error } = await supabase
    .from("marketing_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-blue-600" size={28} />
        <h1 className="text-2xl font-black uppercase tracking-tight">Marketing Logs</h1>
      </div>

      <MarketingTrackerClient initial={sp} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* MOBILE SCROLL FIX */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b">
              <tr>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4 w-40">Action</th>
                <th className="p-4 w-64">Actor</th>
                <th className="p-4">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-mono text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px] uppercase">{log.action}</span></td>
                  <td className="p-4 font-bold text-gray-700 whitespace-nowrap">{log.actor_email}</td>
                  <td className="p-4">
                    <pre className="text-[10px] bg-gray-50 p-2 rounded border border-gray-100 max-w-xs overflow-hidden truncate">
                      {JSON.stringify(log.details)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
