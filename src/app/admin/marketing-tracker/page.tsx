import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { pageMetadata } from "@/lib/seo";
import MarketingTrackerClient from "./_components/MarketingTrackerClient";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export const metadata = pageMetadata({
  title: "Marketing Tracker",
  description: "Audit logs for marketing posts and actions.",
  path: "/admin/marketing-tracker",
  index: false,
});

type SearchParams = Record<string, string | string[] | undefined>;

type MarketingLogRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  details: any;
};

function asString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function clampInt(v: string, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export default async function MarketingTrackerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServer();

  // 1. Redirect to / if not logged in at all
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/");
  }

  // 2. Redirect to /dashboard if not superadmin (Fixes TS2339)
  const gate = await requireSuperadmin();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  const q = asString(sp.q).trim();
  const action = asString(sp.action).trim();
  const actorEmail = asString(sp.actor_email).trim();

  const page = clampInt(asString(sp.page), 1, 9999, 1);
  const pageSize = clampInt(asString(sp.page_size), 10, 100, 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Dropdown options
  const { data: actorsRaw } = await supabase
    .from("marketing_logs")
    .select("actor_email")
    .limit(2000);

  const actorOptions = Array.from(
    new Set((actorsRaw ?? []).map((x: any) => x.actor_email).filter(Boolean))
  ).map((email) => ({ email: String(email) }));

  // Query
  let query = supabase
    .from("marketing_logs")
    .select("id, created_at, actor_email, action, details", { count: "exact" })
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (actorEmail) query = query.ilike("actor_email", `%${actorEmail}%`);

  // JSON search
  if (q) {
    query = query.or(`actor_email.ilike.%${q}%, action.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);

  const rows = (data ?? []) as MarketingLogRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-4xl italic font-mono font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" size={28} />
            Marketing Tracker
          </div>
          <div className="text-sm text-gray-500">
            Audit trail for FB Posts & Video actions.
          </div>
        </div>

        <Link
          href="/admin/posts"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition shadow-sm bg-white font-medium"
        >
          ← Back to FB Posts
        </Link>
      </div>

      <MarketingTrackerClient
        initial={{
          q,
          action,
          actor_email: actorEmail,
          page,
          page_size: pageSize,
        }}
        meta={{ total, totalPages }}
        options={{ actors: actorOptions }}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm font-medium">
          ⚠️ {error.message}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50/50 transition-colors align-top"
                >
                  <td className="p-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                    {new Date(r.created_at).toLocaleString("en-MY", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        r.action.includes("delete")
                          ? "border-red-100 bg-red-50 text-red-700"
                          : r.action.includes("create")
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-blue-100 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {r.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-900">
                    {r.actor_email || "—"}
                  </td>
                  <td className="p-4">
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-bold text-blue-600 hover:underline list-none uppercase tracking-tighter">
                        View Payload
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-600 font-mono">
                        {JSON.stringify(r.details ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
