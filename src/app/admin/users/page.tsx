import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import UsersClient from "./_components/UsersClient";
import { ShieldAlert, UserCog } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Admin Management",
  description: "Manage system administrators and roles.",
  path: "/admin/users",
  index: false,
});

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();
  
  // 1. Session Protection
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");

  // 2. Superadmin Gate
  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/dashboard");

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
          <div className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
            <ShieldAlert className="text-blue-600" size={28} />
            Admin Management
          </div>
          <p className="text-sm text-gray-500 font-medium italic">
            Control system access levels and permissions.
          </p>
        </div>
        
        {/* ✅ UsersClient called once as a global control */}
        <UsersClient />
      </div>

      {/* Table Container with Mobile Scroll Fix */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">Administrator Email</th>
                <th className="p-4">Access Level</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors align-middle">
                  <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      user.role === 'superadmin' 
                        ? 'bg-purple-50 border-purple-100 text-purple-700' 
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-[11px] text-gray-400 font-mono whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("en-MY", {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                  </td>
                  <td className="p-4 text-right">
                     <button className="inline-flex items-center gap-1 text-blue-600 font-black text-[10px] uppercase hover:underline">
                       <UserCog size={12} />
                       Manage
                     </button>
                  </td>
                </tr>
              ))}
              
              {!users?.length && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                    No administrators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase">
          ⚠️ {error.message}
        </div>
      )}
    </div>
  );
}
