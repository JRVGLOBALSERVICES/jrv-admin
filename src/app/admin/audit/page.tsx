import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "User Audit Logs",
  description: "View edit/delete actions for users.",
  path: "/admin/audit",
  index: false,
});

export default async function AuditPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServer();

  const { data: logs, error } = await supabase
    .from("admin_audit_logs")
    .select("id,actor_user_id,action,target_user_id,meta,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return <div className="p-6 text-red-600">{error.message}</div>;

  const ids = Array.from(
    new Set(
      (logs ?? [])
        .flatMap((l: any) => [l.actor_user_id, l.target_user_id])
        .filter(Boolean)
    )
  );
  const { data: admins } = await supabase
    .from("admin_users")
    .select("user_id,email,role")
    .in("user_id", ids);

  const emailOf = (uid: string) =>
    admins?.find((a: any) => a.user_id === uid)?.email ?? (
      <span className="font-mono text-[10px] opacity-50">
        {uid.slice(0, 8)}...
      </span>
    );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-900">User Audit Logs</h1>
        <p className="text-sm text-gray-500">
          Track changes to admin accounts.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="p-3 w-40">Time</th>
              <th className="p-3 w-48">Actor</th>
              <th className="p-3 w-32">Action</th>
              <th className="p-3 w-48">Target User</th>
              <th className="p-3">Change Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(logs ?? []).map((l: any) => (
              <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-3 text-xs text-gray-500 font-mono">
                  {new Date(l.created_at).toLocaleString("en-MY", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </td>
                <td className="p-3 font-medium text-gray-900 text-xs">
                  {emailOf(l.actor_user_id)}
                </td>
                <td className="p-3">
                  <span className="inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                    {l.action}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-600">
                  {l.target_user_id ? (
                    emailOf(l.target_user_id)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="p-3">
                  {/* ✅ CLEAN KEY-VALUE LIST */}
                  <div className="flex flex-wrap gap-2">
                    {l.meta &&
                      Object.entries(l.meta).map(([k, v]) => (
                        <div
                          key={k}
                          className="text-[11px] px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded flex gap-1"
                        >
                          <span className="font-bold uppercase opacity-60">
                            {k}:
                          </span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    {!l.meta && (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td className="p-8 text-center text-gray-400" colSpan={5}>
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
