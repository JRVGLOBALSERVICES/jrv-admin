import { createSupabaseServer } from "@/lib/supabase/server";
import { LogTable } from "./LogTable";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { LogToolbar } from "./LogToolbar";

export const metadata: Metadata = pageMetadata({
  title: "Agreement Logs",
  description: "View create/update/delete actions for agreements.",
  path: "/admin/agreements/logs",
  index: false,
});

export const dynamic = "force-dynamic";

// 1. Update the type definition to wrap searchParams in a Promise
type PageProps = {
  searchParams: Promise<{ q?: string; action?: string }>;
};

// 2. Change signature to accept 'props'
export default async function AgreementLogsPage(props: PageProps) {
  // 3. Await the searchParams before accessing properties
  const searchParams = await props.searchParams;

  const supabase = await createSupabaseServer();

  // 1. Start Query
  let query = supabase
    .from("agreement_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // 2. Apply Search (Agreement ID or Actor Email)
  // Now valid because searchParams is a plain object
  if (searchParams.q) {
    const term = searchParams.q;
    // Check if term is a valid UUID to search by ID, otherwise search email
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

  // 3. Apply Action Filter
  if (searchParams.action) {
    query = query.eq("action", searchParams.action);
  }

  // 4. Fetch
  const { data: logs, error } = await query;

  if (error) {
    console.error("Log fetch error:", error);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Audit Logs
          </h1>
          <p className="text-sm text-gray-500">
            Track all changes, updates, and deletions history.
          </p>
        </div>
      </div>

      {/* ✅ Add Toolbar Here */}
      {/* Note: If LogToolbar needs to read URL params, you might need to pass them down explicitly now */}
      <LogToolbar />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <LogTable initialLogs={logs || []} />
      </div>
    </div>
  );
}
