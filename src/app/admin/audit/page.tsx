import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, History } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "User Audit Logs",
  description: "View edit/delete actions for users.",
  path: "/admin/audit",
  index: false,
});

export default async function AuditPage() {
  const supabase = await createSupabaseServer();

  // 1. Session check for login redirect
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  // 2. Superadmin check for dashboard redirect
  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/admin");

  const { data: logs, error } = await supabase
    .from("admin_audit_logs")
    .select("id,actor_user_id,action,target_user_id,meta,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error)
    return (
      <div className="p-6 text-red-600 border rounded-lg bg-red-50">
        {error.message}
      </div>
    );

  // Fetch emails for actor/target from admin_users
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
    admins?.find((a: any) => a.user_id === uid)?.email ?? uid;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-4xl italic font-mono font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" size={28} />
            User Audit Logs
          </div>
          <div className="text-sm text-gray-500">
            Internal trail of admin actions and user modifications.
          </div>
        </div>
        <Link
          href="/admin/users"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition shadow-sm bg-white font-medium"
        >
          ← Back to Users
        </Link>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target User</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(logs ?? []).map((l: any) => (
                <tr
                  key={l.id}
                  className="hover:bg-gray-50/50 transition-colors align-top"
                >
                  <td className="p-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                    {new Date(l.created_at).toLocaleString("en-MY", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </td>
                  <td className="p-4 font-bold text-gray-900">
                    {emailOf(l.actor_user_id)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        l.action.includes("DELETE")
                          ? "border-red-100 bg-red-50 text-red-700"
                          : l.action.includes("CREATE")
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-blue-100 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {l.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {l.target_user_id ? emailOf(l.target_user_id) : "—"}
                  </td>
                  <td className="p-4">
                    {l.meta ? (
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-bold text-blue-600 hover:underline list-none uppercase tracking-tighter">
                          View Meta
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-600 font-mono">
                          {JSON.stringify(l.meta, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {!logs?.length ? (
                <tr>
                  <td className="p-12 text-center text-gray-400" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <History size={32} className="opacity-20" />
                      <p>No audit logs found.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
