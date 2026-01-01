import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import AgreementLogsClient from "./_components/AgreementLogsClient";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Agreement Logs",
  description: "View create/update/delete actions for agreements.",
  path: "/admin/agreements/logs",
  index: false,
});

type SearchParams = Record<string, string | string[] | undefined>;

type AgreementLogRow = {
  id: string;
  created_at: string;
  agreement_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  before: any;
  after: any;
};

type AgreementOption = {
  id: string;
  plate_number: string | null;
  customer_name: string | null;
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

export default async function AgreementLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.status === 401) redirect("/");
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
  const agreementId = asString(sp.agreement_id).trim();
  const actorEmail = asString(sp.actor_email).trim();

  const page = clampInt(asString(sp.page), 1, 9999, 1);
  const pageSize = clampInt(asString(sp.page_size), 10, 100, 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServer();

  // ===== dropdown options =====
  const { data: actorsRaw } = await supabase
    .from("agreement_logs")
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

  const { data: agreementsRaw } = await supabase
    .from("agreements")
    .select("id, plate_number, customer_name")
    .order("updated_at", { ascending: false })
    .limit(2000);

  const agreementOptions = (agreementsRaw ?? []) as AgreementOption[];

  // ===== logs query =====
  let query = supabase
    .from("agreement_logs")
    .select(
      "id, created_at, agreement_id, actor_id, actor_email, action, before, after",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (agreementId) query = query.eq("agreement_id", agreementId);
  if (actorEmail) query = query.ilike("actor_email", `%${actorEmail}%`);

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      [
        `action.ilike.${like}`,
        `actor_email.ilike.${like}`,
        `agreement_id.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error, count } = await query.range(from, to);

  const rows = (data ?? []) as AgreementLogRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Agreement Logs</div>
          <div className="text-sm opacity-70">
            Audit trail for agreements.
          </div>
        </div>

        <Link
          href="/admin/agreements"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
        >
          ← Back to Agreements
        </Link>
      </div>

      <AgreementLogsClient
        initial={{
          q,
          action,
          agreement_id: agreementId,
          actor_email: actorEmail,
          page,
          page_size: pageSize,
        }}
        meta={{ total, totalPages }}
        options={{ actors: actorOptions, agreements: agreementOptions }}
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
                <th className="p-3">Agreement</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Before/After</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const agreementLink = `/admin/agreements/${r.agreement_id}`;
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("en-MY")}
                    </td>

                    <td className="p-3">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs border border-black/10 bg-black/3">
                        {r.action}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <Link
                          className="underline text-xs opacity-80"
                          href={agreementLink}
                        >
                          {r.agreement_id}
                        </Link>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {r.actor_email || "—"}
                        </div>
                        {r.actor_id ? (
                          <div className="font-mono text-xs opacity-70">
                            {r.actor_id}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3">
                      <details className="max-w-180">
                        <summary className="cursor-pointer text-xs underline opacity-80">
                          View JSON
                        </summary>
                        <div className="mt-2 space-y-2">
                          <pre className="whitespace-pre-wrap wrap-break-word text-xs bg-black/3 rounded-lg p-3">
                            {JSON.stringify({ before: r.before }, null, 2)}
                          </pre>
                          <pre className="whitespace-pre-wrap wrap-break-word text-xs bg-black/3 rounded-lg p-3">
                            {JSON.stringify({ after: r.after }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}

              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="p-6 opacity-60">
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
