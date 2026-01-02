import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import UsersClient from "./_components/UsersClient";
import { ShieldAlert } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Admin Management",
  path: "/admin/users",
  index: false,
});

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/dashboard");

  const { data: users } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-blue-600" size={28} />
          <h1 className="text-2xl font-black uppercase tracking-tight">Admin Management</h1>
        </div>
        
        {/* ✅ This is likely how it was: A global button for adding users */}
        <UsersClient /> 
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* FIX: Parent container allows scrolling */}
        <div className="overflow-x-auto">
          {/* FIX: min-w-[800px] ensures the table doesn't squish on mobile */}
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{user.email}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                      user.role === 'superadmin' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("en-MY")}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 font-black text-[10px] uppercase hover:underline">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
