import { createSupabaseServer } from "@/lib/supabase/server";
import { LogTable } from "./LogTable";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { LogToolbar } from "./LogToolbar";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin"; // ✅ Import your gate
import { redirect } from "next/navigation"; // ✅ Import redirect
import { ShieldCheck } from "lucide-react";
export const metadata: Metadata = pageMetadata({
  title: "Agreement Logs",
  description: "View create/update/delete actions for agreements.",
  path: "/admin/agreements/logs",
  index: false,
});

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; action?: string }>;
};

export default async function AgreementLogsPage(props: PageProps) {
  const supabase = await createSupabaseServer();

  // 1. Session Check: If not logged in, redirect to root
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
  }

  // 2. Role Check: If not superadmin, redirect to dashboard
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;

  // 3. Data Fetching Logic
  let query = supabase
    .from("agreement_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.q) {
    const term = searchParams.q;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        term
      );

    if (isUuid) {
      query = query.eq("agreement_id", term);
    } else {
      query = query.ilike("actor_email", `%${term}%`);
    }
  }

  if (searchParams.action) {
    query = query.eq("action", searchParams.action);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error("Log fetch error:", error);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-4xl italic font-mono font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={28} /> Agreement Logs
          </div>
          <div className="text-sm text-gray-500">
            Track all changes, updates, and deletions history.
          </div>
        </div>
      </div>

      <LogToolbar />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <LogTable initialLogs={logs || []} />
      </div>
    </div>
  );
}
