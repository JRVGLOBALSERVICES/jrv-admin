"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/auth/useRole";
import { Button } from "@/components/ui/Button";

type AuditRow = {
  id: string;
  action: string;
  actor_email: string | null;
  target_email: string | null;
  details: any;
  created_at: string;
};

export default function AuditPage() {
  const { role, loading } = useRole();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/admin/audit/list");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load audit");
      setRows(json.rows ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (role === "superadmin") load();
  }, [role]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (role !== "superadmin")
    return <div className="p-6 text-red-600">Access denied</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <Button size="sm" onClick={load} loading={busy}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Actor</th>
              <th className="p-3 text-left">Target</th>
              <th className="p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3 font-mono text-xs">{r.action}</td>
                <td className="p-3">{r.actor_email ?? "—"}</td>
                <td className="p-3">{r.target_email ?? "—"}</td>
                <td className="p-3">
                  <pre className="text-xs whitespace-pre-wrap opacity-80">
                    {JSON.stringify(r.details ?? {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-6 opacity-60">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
