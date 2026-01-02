import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { redirect } from "next/navigation";
import UsersClient from "./_components/UsersClient";

export const metadata: Metadata = pageMetadata({
  title: "Admin Users",
  description: "Manage admin and superadmin users for JRV Car Rental.",
  path: "/admin/users",
  index: false,
});

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();
  
  // 1. If not logged in redirect to /
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
  }

  // 2. If not superadmin (gate.ok is false) redirect to /dashboard
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  return <UsersClient />;
}