import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import CarLogsClient from "./_components/CarLogsClient";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Car Audit Logs",
  description: "View edit/delete actions for cars.",
  path: "/admin/cars/logs",
  index: false,
});

type SearchParams = Record<string, string | string[] | undefined>;

type CarAuditRow = {
  id: string;
  created_at: string;
  actor_user_id: string;
  action: string;
  car_id: string | null;
  meta: any;
};

type ActorOption = { user_id: string; email: string | null };
type CarOption = { id: string; plate_number: string | null };

function asString(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}

function clampInt(v: string, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

// --- META VIEWER HELPER ---
function MetaView({ meta }: { meta: any }) {
  if (!meta || Object.keys(meta).length === 0)
    return <span className="text-gray-300 text-xs">—</span>;

  // If meta has "diff" or "changes" structure, flatten it here if needed.
  // Assuming meta is a simple Key-Value pair of the logged data.

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(meta).map(([k, v]) => {
        if (k === "updated_at" || k === "created_at") return null; // Hide timestamps

        let displayVal = String(v);
        if (typeof v === "boolean") displayVal = v ? "Yes" : "No";
        if (k.includes("price")) displayVal = `RM ${v}`;

        return (
          <div
            key={k}
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-gray-700"
          >
            <span className="font-bold text-gray-500 uppercase">
              {k.replace(/_/g, " ")}:
            </span>
            <span className="font-medium text-gray-900">{displayVal}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function CarLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const gate = await requireSuperadmin();
  if (!gate.ok) {
    return <div className="p-6 text-red-600">Access Denied</div>;
  }

  const q = asString(sp.q).trim();
  const action = asString(sp.action).trim();
  const carId = asString(sp.car_id).trim();
  const actorId = asString(sp.actor_user_id).trim();

  const page = clampInt(asString(sp.page), 1, 9999, 1);
  const pageSize = clampInt(asString(sp.page_size), 10, 100, 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServer();

  // Fetch dropdown data...
  const { data: actorIdsRaw } = await supabase
    .from("car_audit_logs")
    .select("actor_user_id")
    .limit(1000);
  const actorIds = Array.from(
    new Set(
      actorIdsRaw?.map((x: any) => String(x.actor_user_id)).filter(Boolean)
    )
  );

  let actorOptions: ActorOption[] = [];
  if (actorIds.length) {
    const { data } = await supabase
      .from("admin_users")
      .select("user_id,email")
      .in("user_id", actorIds);
    actorOptions = (data ?? []) as ActorOption[];
  }

  const { data: carsForDropdown } = await supabase
    .from("cars")
    .select("id,plate_number")
    .limit(1000);
  const carOptions = (carsForDropdown ?? []) as CarOption[];

  let query = supabase
    .from("car_audit_logs")
    .select("id, created_at, actor_user_id, action, car_id, meta", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (carId) query = query.eq("car_id", carId);
  if (actorId) query = query.eq("actor_user_id", actorId);
  if (q) query = query.ilike("action", `%${q}%`);

  const { data, error, count } = await query.range(from, to);
  const rows = (data ?? []) as CarAuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Resolve Emails & Plates map
  const actorEmailMap = new Map<string, string>();
  actorOptions.forEach((a) => actorEmailMap.set(a.user_id, a.email || ""));
  const plateMap = new Map<string, string>();
  carOptions.forEach((c) => plateMap.set(c.id, c.plate_number || ""));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-gray-900">Car Logs</div>
          <div className="text-sm text-gray-500">
            Audit trail for fleet changes.
          </div>
        </div>
        <Link
          href="/admin/cars"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition"
        >
          ← Back to Cars
        </Link>
      </div>

      <CarLogsClient
        initial={{
          q,
          action,
          car_id: carId,
          actor_user_id: actorId,
          page,
          page_size: pageSize,
        }}
        meta={{ total, totalPages }}
        options={{ actors: actorOptions, cars: carOptions }}
      />

      {error ? (
        <div className="text-red-600 p-4 border rounded">{error.message}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="p-3 w-40">Time</th>
                <th className="p-3 w-32">Action</th>
                <th className="p-3 w-32">Car</th>
                <th className="p-3 w-48">Actor</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const plate = plateMap.get(r.car_id || "") || r.car_id;
                const email =
                  actorEmailMap.get(r.actor_user_id) || r.actor_user_id;
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/50 transition-colors align-top"
                  >
                    <td className="p-3 text-xs text-gray-500 font-mono">
                      {new Date(r.created_at).toLocaleString("en-MY", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                          r.action.includes("DELETE")
                            ? "bg-red-50 text-red-700 border-red-100"
                            : r.action.includes("UPDATE")
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        {r.action.replace(/_CAR/g, "")}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-700 text-xs">
                      {plate || "—"}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{email}</td>
                    <td className="p-3">
                      {/* ✅ USE NEW META VIEWER */}
                      <MetaView meta={r.meta} />
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
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
