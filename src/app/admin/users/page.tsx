"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/auth/useRole";
import { Button } from "@/components/ui/Button";

type AdminRow = {
  id: string;
  user_id: string;
  role: "admin" | "superadmin";
  email: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const { role, loading } = useRole();

  const [rows, setRows] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "superadmin">("admin");
  const [busy, setBusy] = useState(false);

  const [lastInvite, setLastInvite] = useState<{
    invite_link: string;
    whatsapp_url: string;
  } | null>(null);

  /* =========================
     Load admin users
     ========================= */
  async function load() {
    const res = await fetch("/admin/users/list");
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load admins");
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    if (role === "superadmin") load().catch(console.error);
  }, [role]);

  /* =========================
     Guards
     ========================= */
  if (loading) return <div className="p-6">Loading…</div>;
  if (role !== "superadmin")
    return <div className="p-6 text-red-600">Access denied</div>;

  /* =========================
     Actions
     ========================= */
  async function inviteAdmin() {
    if (!email) return alert("Email required");

    setBusy(true);
    setLastInvite(null);

    try {
      const res = await fetch("/admin/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole, whatsapp }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Invite failed");

      setEmail("");
      setWhatsapp("");
      setLastInvite({
        invite_link: json.invite_link,
        whatsapp_url: json.whatsapp_url,
      });

      window.open(json.whatsapp_url, "_blank", "noopener,noreferrer");
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function disableUser(user_id: string) {
    if (!confirm("Disable this user? They will not be able to login.")) return;

    setBusy(true);
    try {
      const res = await fetch("/admin/users/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Disable failed");
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(email: string) {
    if (!confirm("Generate password reset link and send via WhatsApp?")) return;

    setBusy(true);
    try {
      const res = await fetch("/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Reset failed");

      window.open(json.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAdmin(user_id: string) {
    if (!confirm("Remove admin access for this user?")) return;

    setBusy(true);
    try {
      const res = await fetch("/admin/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Remove failed");
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  /* =========================
     Render
     ========================= */
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin Users</h1>
        <p className="text-sm opacity-70">
          Superadmin can invite, disable and manage admins.
        </p>
      </header>

      {/* Invite */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-medium">Invite Admin</h2>

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
          placeholder="WhatsApp number (optional)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <Button
          fullWidth
          loading={busy}
          onClick={inviteAdmin}
          sound="on"
          haptics="auto"
        >
          Generate & Send WhatsApp Invite
        </Button>

        {lastInvite && (
          <div className="rounded-lg border bg-gray-50 p-3 text-xs break-all">
            <div className="font-medium mb-1">Invite link</div>
            {lastInvite.invite_link}
          </div>
        )}
      </section>

      {/* List */}
      <section className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">User ID</th>
              <th className="p-3 text-right">Actions</th>
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
                <td className="p-3 text-right space-x-2">
                  {r.email && (
                    <Button
                      size="sm"
                      variant="secondary"
                      sound="off"
                      onClick={() => resetPassword(r.email!)}
                    >
                      Reset PW
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    sound="off"
                    onClick={() => disableUser(r.user_id)}
                  >
                    Disable
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    sound="off"
                    onClick={() => removeAdmin(r.user_id)}
                  >
                    Remove Admin
                  </Button>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td className="p-6 opacity-60" colSpan={4}>
                  No admin users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
