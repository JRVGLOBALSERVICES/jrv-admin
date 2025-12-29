import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { pageMetadata } from "@/lib/seo";
import MarketingTrackerClient from "./_components/MarketingTrackerClient";

// ✅ SEO Metadata
export const metadata = pageMetadata({
  title: "Marketing Tracker",
  description: "Audit logs for marketing posts and actions.",
  path: "/admin/marketing-tracker",
});

type SearchParams = Record<string, string | string[] | undefined>;

type MarketingLogRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  details: any;
};

type ActorOption = { email: string | null };

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
  const gate = await requireAdmin();

  if (!gate.ok) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {gate.message}
        </div>
      </div>
    );
  }

  const q = asString(sp.q).trim();
  const action = asString(sp.action).trim();
  const actorEmail = asString(sp.actor_email).trim();

  const page = clampInt(asString(sp.page), 1, 9999, 1);
  const pageSize = clampInt(asString(sp.page_size), 10, 100, 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServer();

  // ===== dropdown options (Actors) =====
  const { data: actorsRaw } = await supabase
    .from("marketing_logs")
    .select("actor_email")
    .order("created_at", { ascending: false })
    .limit(5000);

  const actorOptions: ActorOption[] = Array.from(
    new Set(
      (actorsRaw ?? [])
        .map((x: any) => String(x.actor_email ?? "").trim())
        .filter(Boolean)
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((email) => ({ email }));

  // ===== logs query =====
  let query = supabase
    .from("marketing_logs")
    .select("id, created_at, actor_email, action, details", { count: "exact" })
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (actorEmail) query = query.ilike("actor_email", `%${actorEmail}%`);

  if (q) {
    // Note: JSON search in Supabase via text cast
    query = query.or(`actor_email.ilike.%${q}%, details.cs.{"title": "${q}"}`); 
  }

  const { data, error, count } = await query.range(from, to);

  const rows = (data ?? []) as MarketingLogRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Marketing Logs</div>
          <div className="text-sm opacity-70">
            Audit trail for FB Posts & Video actions.
          </div>
        </div>

        <Link
          href="/admin/posts"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
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
        <div className="rounded-lg border p-3 text-sm text-red-600">
          {error.message}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-300 w-full text-sm">
            <thead className="bg-black/3">
              <tr className="text-left">
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("en-MY")}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs border ${
                        r.action.includes("delete")
                          ? "border-red-200 bg-red-50 text-red-700"
                          : r.action.includes("create")
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {r.action}
                    </span>
                  </td>

                  <td className="p-3 font-medium">
                    {r.actor_email || "—"}
                  </td>

                  <td className="p-3">
                    <details className="max-w-xl">
                      <summary className="cursor-pointer text-xs underline opacity-80">
                        View JSON
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap wrap-break-word text-xs bg-black/3 rounded-lg p-3">
                        {JSON.stringify(r.details ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td colSpan={4} className="p-6 opacity-60">
                    No logs found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}