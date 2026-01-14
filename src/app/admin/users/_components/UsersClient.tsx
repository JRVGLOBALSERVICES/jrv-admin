"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Key,
  Ban,
  CheckCircle2,
} from "lucide-react";

type AdminRow = {
  user_id: string;
  email: string;
  phone: string | null;
  role: "admin" | "superadmin";
  status: "active" | "disabled";
  created_at: string;
  created_by: string | null;
};

function StatusBadge({ status }: { status: "active" | "disabled" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
        status === "active"
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-red-50 text-red-700 border-red-100",
      ].join(" ")}
    >
      {status === "active" ? <CheckCircle2 size={10} /> : <Ban size={10} />}
      {status}
    </span>
  );
}

export default function UsersClient() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRole, setCRole] = useState<"admin" | "superadmin">("admin");
  const [cPass, setCPass] = useState("");
  const [busy, setBusy] = useState(false);

  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pw, setPw] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/users/api", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load users");
      setRows(json.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const postAction = async (payload: any) => {
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
      if (payload.action === "create") {
        setCEmail("");
        setCPass("");
        setCPhone("");
      }
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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} />
            Admin Management
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Add or manage system administrators.
          </div>
        </div>
        <Link
          href="/admin/dashboard"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition shadow-sm bg-white font-bold"
        >
          ← Dashboard
        </Link>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm font-medium">
          ⚠️ {err}
        </div>
      )}

      {/* Create Form */}
      <Card className="p-5 border-gray-200 shadow-sm bg-white overflow-hidden relative">
        <div className="font-bold text-sm text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-tight">
          <UserPlus size={18} className="text-blue-500" /> Create New Admin
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
              Email
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition"
              placeholder="email@jrv.com"
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
              Phone
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition"
              placeholder="Optional"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
              Role
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              value={cRole}
              onChange={(e) => setCRole(e.target.value as any)}
            >
              <option value="admin">Standard Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
              Temporary Password
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition"
              placeholder="Min 6 chars"
              type="password"
              value={cPass}
              onChange={(e) => setCPass(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end mt-5 border-t pt-4 border-gray-50">
          <Button
            loading={busy}
            onClick={() =>
              postAction({
                action: "create",
                email: cEmail,
                phone: cPhone,
                role: cRole,
                tempPassword: cPass,
              })
            }
          >
            Register Admin
          </Button>
        </div>
      </Card>

      {/* Scrollable Table Wrapper */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-200">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">Identity</th>
                <th className="p-4">Access Level</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-gray-400 animate-pulse uppercase text-xs font-bold tracking-widest"
                  >
                    Fetching users...
                  </td>
                </tr>
              ) : !sorted.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-gray-400 font-medium italic"
                  >
                    No admin users found.
                  </td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr
                    key={u.user_id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-gray-900 whitespace-nowrap">
                        {u.email}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {u.phone ?? "No phone recorded"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded border ${u.role === "superadmin"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-gray-50 text-gray-600 border-gray-100"
                          }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end whitespace-nowrap">
                        {u.role !== "superadmin" ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="font-bold uppercase text-[10px] tracking-tight"
                              loading={busy}
                              onClick={() =>
                                postAction({
                                  action: "toggle",
                                  user_id: u.user_id,
                                  enable: u.status !== "active",
                                })
                              }
                            >
                              {u.status === "active" ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              className="font-bold uppercase text-[10px] tracking-tight"
                              variant="primary"
                              disabled={busy}
                              onClick={() => {
                                setPwUserId(u.user_id);
                                setPw("");
                              }}
                            >
                              <Key size={12} className="mr-1" /> PW
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="p-2"
                              loading={busy}
                              onClick={() =>
                                confirm(`Delete ${u.email}?`) &&
                                postAction({
                                  action: "delete",
                                  user_id: u.user_id,
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-gray-400 px-2 py-1 italic uppercase tracking-widest">
                            Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Modal */}
      {pwUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
              <Key className="text-blue-500" /> Reset Password
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Enter a new password for this administrator.
            </p>
            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500 border-gray-200 transition"
              placeholder="New password (6+ chars)"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
            />
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 font-bold uppercase"
                variant="secondary"
                onClick={() => setPwUserId(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 font-bold uppercase"
                loading={busy}
                onClick={() =>
                  postAction({
                    action: "set_password",
                    user_id: pwUserId,
                    newPassword: pw,
                  }).then(() => setPwUserId(null))
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
