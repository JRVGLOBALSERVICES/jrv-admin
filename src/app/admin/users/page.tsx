"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/auth/useRole";
import { Button } from "@/components/ui/Button";

type Row = {
  id: string;
  user_id: string;
  role: "admin" | "superadmin";
  email: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const { role, loading } = useRole();

  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "superadmin">("admin");
  const [whatsapp, setWhatsapp] = useState(""); // MY number
  const [busy, setBusy] = useState(false);

  const [lastInvite, setLastInvite] = useState<{
    invite_link: string;
    whatsapp_url: string;
  } | null>(null);

  async function load() {
    const res = await fetch("/admin/users/list");
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load");
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    if (role === "superadmin") load().catch(() => {});
  }, [role]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (role !== "superadmin")
    return <div className="p-6 text-red-600">Access denied</div>;

  async function onAdd() {
    setBusy(true);
    setLastInvite(null);

    try {
      const res = await fetch("/admin/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole, whatsapp }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to add");

      setEmail("");
      setWhatsapp("");

      setLastInvite({
        invite_link: json.invite_link,
        whatsapp_url: json.whatsapp_url,
      });

      // Auto-open WhatsApp
      window.open(json.whatsapp_url, "_blank", "noopener,noreferrer");

      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed. You can manually copy it.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Admin Users</div>
        <div className="text-sm opacity-70">
          Invite admins via WhatsApp with an instant setup link.
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="font-medium">Create Admin Invite</div>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="w-full border rounded-lg px-3 py-2"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as any)}
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="WhatsApp number (MY) e.g. 01170193138 or +601170193138"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <Button
          onClick={onAdd}
          loading={busy}
          fullWidth
          sound="on"
          haptics="auto"
        >
          Generate & Send WhatsApp Invite
        </Button>

        {lastInvite && (
          <div className="mt-2 rounded-lg border bg-gray-50 p-3 space-y-2 text-sm">
            <div className="font-medium">Invite created</div>

            <div className="break-all">
              <div className="text-xs opacity-60 mb-1">Invite link</div>
              <div className="font-mono text-xs">{lastInvite.invite_link}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(lastInvite.whatsapp_url, "_blank")}
              >
                Open WhatsApp Again
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copy(lastInvite.invite_link)}
                sound="off"
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">User ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">
                  {r.email ?? <span className="opacity-60">unknown</span>}
                </td>
                <td className="p-3">
                  <span className="rounded bg-black text-white px-2 py-1 text-xs capitalize">
                    {r.role}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">{r.user_id}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-6 opacity-60" colSpan={3}>
                  No admin users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
