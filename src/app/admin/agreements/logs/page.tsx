import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AgreementLogsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">{gate.message}</div>
      </div>
    );
  }

  if (gate.role !== "superadmin") {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          Superadmin only
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("agreement_logs")
    .select("id, agreement_id, actor_email, action, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="text-xl font-semibold">Agreement Logs</div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Agreement ID</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{new Date(r.created_at).toLocaleString("en-MY")}</td>
                <td className="p-3 font-mono text-xs">{r.agreement_id}</td>
                <td className="p-3">{r.actor_email}</td>
                <td className="p-3 font-medium">{r.action}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="p-3 opacity-60" colSpan={4}>
                  No logs
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
