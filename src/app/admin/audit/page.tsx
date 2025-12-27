import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export default async function AuditPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServer();

  const { data: logs, error } = await supabase
    .from("admin_audit_logs")
    .select("id,actor_user_id,action,target_user_id,meta,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return <div className="text-red-600">{error.message}</div>;

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
    <div className="space-y-4">
      <div className="text-xl font-semibold">Audit Logs</div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="p-3 text-left">When</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Target</th>
                <th className="p-3 text-left">Meta</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l: any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">{emailOf(l.actor_user_id)}</td>
                  <td className="p-3 font-medium">{l.action}</td>
                  <td className="p-3">{l.target_user_id ? emailOf(l.target_user_id) : "-"}</td>
                  <td className="p-3 text-xs opacity-80">
                    {l.meta ? JSON.stringify(l.meta) : "-"}
                  </td>
                </tr>
              ))}
              {!logs?.length ? (
                <tr><td className="p-6 text-center opacity-60" colSpan={5}>No audit logs</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
