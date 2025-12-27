import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="text-sm opacity-70">Logged in as: {user?.email}</div>
    </div>
  );
}
