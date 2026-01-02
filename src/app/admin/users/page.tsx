import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import UsersClient from "./_components/UsersClient";
import { Users, ShieldCheck } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Admin Users",
  description: "Manage admin and superadmin users for JRV Car Rental.",
  path: "/admin/users",
  index: false,
});

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();
  
  // 1. Session Check (Redirect to root if guest)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
  }

  // 2. Role Check (Redirect to dashboard if not superadmin)
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  // 3. Fetch Data
  const { data: users, error } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
            <Users className="text-blue-600" size={28} />
            Admin Management
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Control access levels for the JRV Admin Portal.
          </p>
        </div>
      </div>

      {/* Stats/Info (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Admins</div>
          <div className="text-2xl font-black text-blue-900">{users?.length || 0}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* MOBILE SCROLL FIX START */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">Admin Email</th>
                <th className="p-4 w-40">Role</th>
                <th className="p-4 w-48">Added On</th>
                <th className="p-4 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{user.email}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{user.user_id}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                      user.role === 'superadmin' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {user.role === 'superadmin' && <ShieldCheck size={10} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("en-MY", {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="p-4 text-right">
                    {/* Handled by client component for modals/actions */}
                    <UsersClient user={user} />
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                    No admin users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* MOBILE SCROLL FIX END */}
      </div>
    </div>
  );
}
