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

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Create form
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRole, setCRole] = useState<"admin" | "superadmin">("admin");
  const [cPass, setCPass] = useState("");
  const [busy, setBusy] = useState(false);

  // Modal for password set
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
    // superadmins first, then active, then newest
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

      {err ? (
        <div className="rounded-lg border bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      ) : null}

      {/* Create */}
      <Card className="p-4 space-y-3">
        <div className="font-semibold">Create Admin</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Email"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Phone (optional)"
            value={cPhone}
            onChange={(e) => setCPhone(e.target.value)}
          />
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={cRole}
            onChange={(e) => setCRole(e.target.value as any)}
          >
            <option value="admin">admin</option>
            <option value="superadmin">superadmin</option>
          </select>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Temp Password (6+)"
            value={cPass}
            onChange={(e) => setCPass(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button
            loading={busy}
            sound="on"
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
        <div className="overflow-x-auto">
          <table className="min-w-245 w-full text-sm">
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center opacity-60">
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && !sorted.length ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center opacity-60">
                    No admin users
                  </td>
                </tr>
              ) : null}

              {sorted.map((u) => (
                <tr key={u.user_id} className="border-t">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phone ?? "-"}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    <Badge status={u.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {u.role !== "superadmin" ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              post({
                                action: "toggle",
                                user_id: u.user_id,
                                enable: u.status !== "active",
                              })
                            }
                            sound="on"
                          >
                            {u.status === "active" ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setPwUserId(u.user_id);
                              setPw("");
                            }}
                            sound="on"
                          >
                            Set Password
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete ${u.email}? This removes auth + admin record.`
                                )
                              ) {
                                post({ action: "delete", user_id: u.user_id });
                              }
                            }}
                            sound="on"
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs opacity-60">Protected</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password modal */}
      {pwUserId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setPwUserId(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border bg-white p-4 space-y-3">
            <div className="font-semibold">Set Password</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="New password (6+)"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setPwUserId(null)}
                sound="on"
              >
                Cancel
              </Button>
              <Button
                loading={busy}
                onClick={() =>
                  post({
                    action: "set_password",
                    user_id: pwUserId,
                    newPassword: pw,
                  }).then(() => setPwUserId(null))
                }
                sound="on"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
