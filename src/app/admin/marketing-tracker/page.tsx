import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import MarketingTrackerClient from "./_components/MarketingTrackerClient";
import { ShieldAlert } from "lucide-react";

export default async function MarketingTrackerPage({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  const supabase = await createSupabaseServer();

  // 1. Session & Role Protection
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/admin");

  const sp = await searchParams;

  // 2. Extract params with defaults for the Client Component
  const q = (sp.q || "").trim();
  const action = (sp.action || "").trim();
  const actorEmail = (sp.actor_email || "").trim();
  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = Math.max(10, Number(sp.page_size || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 3. Fetch Data, Counts, and Dropdown Options
  const [logsRes, actorsRes] = await Promise.all([
    supabase
      .from("marketing_logs")
      .select("*", { count: "exact" })
      .ilike("actor_email", `%${actorEmail}%`)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("marketing_logs")
      .select("actor_email")
      .limit(1000)
  ]);

  // Unique list of actors for the filter dropdown
  const actorOptions = Array.from(
    new Set((actorsRes.data ?? []).map((x: any) => x.actor_email).filter(Boolean))
  ).map(email => ({ email: String(email) }));

  const logs = logsRes.data || [];
  const total = logsRes.count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-blue-600" size={28} />
        <h1 className="text-2xl font-black uppercase tracking-tight">Marketing Tracker</h1>
      </div>

      {/* ✅ FIXED: Passing all required props to satisfy TypeScript */}
      <MarketingTrackerClient 
        initial={{ 
          q, 
          action, 
          actor_email: actorEmail, 
          page, 
          page_size: pageSize 
        }} 
        meta={{ total, totalPages }} 
        options={{ actors: actorOptions }} 
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* MOBILE SCROLL FIX */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b tracking-widest">
              <tr>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4 w-40">Action</th>
                <th className="p-4 w-64">Actor</th>
                <th className="p-4">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-mono text-xs whitespace-nowrap text-gray-400">
                    {new Date(log.created_at).toLocaleString("en-MY", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px] uppercase border border-blue-100">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-700 whitespace-nowrap">{log.actor_email}</td>
                  <td className="p-4">
                    <details className="group">
                      <summary className="cursor-pointer text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest list-none">
                        View Payload
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] bg-gray-900 text-gray-300 rounded-xl p-4 font-mono border border-gray-800 shadow-inner">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                    No marketing logs found.
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
