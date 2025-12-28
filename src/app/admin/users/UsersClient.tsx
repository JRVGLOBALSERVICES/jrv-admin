"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AdminRow = {
  user_id: string;
  email: string;
  phone: string | null;
  role: "admin" | "superadmin";
  status: "active" | "disabled";
  created_at: string;
  created_by: string | null;
};

function Badge({ status }: { status: "active" | "disabled" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        status === "active"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700",
      ].join(" ")}
    >
      {status === "active" ? "Active" : "Disabled"}
    </span>
  );
}

export default function UsersClient() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Create form
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRole, setCRole] = useState<"admin" | "superadmin">("admin");
  const [cPass, setCPass] = useState("");
  const [busy, setBusy] = useState(false);

  // Password modal
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pw, setPw] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch("/admin/users/api", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setErr(json?.error || "Failed to load users");
      setLoading(false);
      return;
    }
    setRows(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const post = async (payload: any) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/admin/users/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Action failed");
      await fetchRows();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.role !== b.role) return a.role === "superadmin" ? -1 : 1;
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Admin Users</div>

      {err && (
        <div className="rounded-lg border bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      {/* Create */}
      <Card className="p-4 space-y-3">
        <div className="font-semibold">Create Admin</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Email"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Phone"
            value={cPhone}
            onChange={(e) => setCPhone(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={cRole}
            onChange={(e) => setCRole(e.target.value as any)}
          >
            <option value="admin">admin</option>
            <option value="superadmin">superadmin</option>
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Temp Password"
            value={cPass}
            onChange={(e) => setCPass(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button
            loading={busy}
            onClick={() =>
              post({
                action: "create",
                email: cEmail,
                phone: cPhone,
                role: cRole,
                tempPassword: cPass,
              })
            }
          >
            Create
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.user_id} className="border-t">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone ?? "-"}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <Badge status={u.status} />
                </td>
                <td className="p-3 text-right">
                  {u.role !== "superadmin" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        confirm(`Delete ${u.email}?`) &&
                        post({ action: "delete", user_id: u.user_id })
                      }
                    >
                      Delete
                    </Button>
                  ) : (
                    <span className="text-xs opacity-60">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
