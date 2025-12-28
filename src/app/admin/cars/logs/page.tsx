// src/app/admin/cars/logs/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import CarLogsClient from "./_components/CarLogsClient";

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

export default async function CarLogsPage({
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
  const carId = asString(sp.car_id).trim(); // stored as car UUID
  const actorId = asString(sp.actor_user_id).trim(); // stored as user UUID

  const page = clampInt(asString(sp.page), 1, 9999, 1);
  const pageSize = clampInt(asString(sp.page_size), 10, 100, 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServer();

  // ===== dropdown options =====
  // Actors: show only those who ever appear in logs (so dropdown is clean)
  const { data: actorIdsRaw } = await supabase
    .from("car_audit_logs")
    .select("actor_user_id")
    .order("created_at", { ascending: false })
    .limit(5000);

  const actorIds = Array.from(
    new Set(
      (actorIdsRaw ?? [])
        .map((x: any) => String(x.actor_user_id))
        .filter(Boolean)
    )
  );

  let actorOptions: ActorOption[] = [];
  if (actorIds.length) {
    const { data } = await supabase
      .from("admin_users")
      .select("user_id,email")
      .in("user_id", actorIds);
    actorOptions = (data ?? []) as ActorOption[];
    actorOptions.sort((a, b) =>
      String(a.email ?? "").localeCompare(String(b.email ?? ""))
    );
  }

  // Cars: use plate number dropdown (maps to car_id)
  const { data: carsForDropdown } = await supabase
    .from("cars")
    .select("id,plate_number")
    .order("created_at", { ascending: false })
    .limit(2000);

  const carOptions = (carsForDropdown ?? []) as CarOption[];

  // ===== logs query =====
  let query = supabase
    .from("car_audit_logs")
    .select("id, created_at, actor_user_id, action, car_id, meta", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (carId) query = query.eq("car_id", carId);
  if (actorId) query = query.eq("actor_user_id", actorId);

  // simple q search
  if (q) {
    const looksUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    if (looksUuid) {
      query = query.or(`car_id.eq.${q},actor_user_id.eq.${q}`);
    } else {
      query = query.ilike("action", `%${q}%`);
    }
  }

  const { data, error, count } = await query.range(from, to);

  const rows = (data ?? []) as CarAuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ===== map actor id -> email for display =====
  const actorEmailMap = new Map<string, string>();
  {
    const idsInRows = Array.from(
      new Set(rows.map((r) => r.actor_user_id).filter(Boolean))
    );
    if (idsInRows.length) {
      const { data: au } = await supabase
        .from("admin_users")
        .select("user_id,email")
        .in("user_id", idsInRows);

      (au ?? []).forEach((r: any) => {
        actorEmailMap.set(String(r.user_id), String(r.email ?? ""));
      });
    }
  }

  // ===== map car id -> plate for display =====
  const plateMap = new Map<string, string>();
  {
    const idsInRows = Array.from(
      new Set(rows.map((r) => r.car_id).filter(Boolean))
    ) as string[];
    if (idsInRows.length) {
      const { data: cs } = await supabase
        .from("cars")
        .select("id,plate_number")
        .in("id", idsInRows);

      (cs ?? []).forEach((r: any) => {
        plateMap.set(String(r.id), String(r.plate_number ?? ""));
      });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Car Logs</div>
          <div className="text-sm opacity-70">
            Audit trail for CREATE / UPDATE / DELETE.
          </div>
        </div>

        <Link
          href="/admin/cars"
          className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
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
        meta={{
          total,
          totalPages,
        }}
        options={{
          actors: actorOptions,
          cars: carOptions,
        }}
      />

      {error ? (
        <div className="rounded-lg border p-3 text-sm text-red-600">
          {error.message}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left">
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Car</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const carLink = r.car_id ? `/admin/cars/${r.car_id}` : null;
                const plate = r.car_id ? plateMap.get(r.car_id) : "";
                const actorEmail = actorEmailMap.get(r.actor_user_id) || "";

                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>

                    <td className="p-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-xs border",
                          r.action === "DELETE_CAR"
                            ? "border-red-200 text-red-700 bg-red-50"
                            : r.action === "UPDATE_CAR"
                            ? "border-amber-200 text-amber-800 bg-amber-50"
                            : "border-emerald-200 text-emerald-800 bg-emerald-50",
                        ].join(" ")}
                      >
                        {r.action}
                      </span>
                    </td>

                    <td className="p-3">
                      {r.car_id ? (
                        <div className="space-y-1">
                          <div className="font-medium">{plate || "—"}</div>
                          {carLink ? (
                            <Link
                              className="underline text-xs opacity-80"
                              href={carLink}
                            >
                              {r.car_id}
                            </Link>
                          ) : (
                            <div className="text-xs opacity-60">{r.car_id}</div>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-60">—</span>
                      )}
                    </td>

                    <td className="p-3">
                      {actorEmail ? (
                        <div className="space-y-1">
                          <div className="font-medium">{actorEmail}</div>
                          <div className="font-mono text-xs opacity-70">
                            {r.actor_user_id}
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs">
                          {r.actor_user_id}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <details className="max-w-[720px]">
                        <summary className="cursor-pointer text-xs underline opacity-80">
                          View JSON
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-xs bg-black/[0.03] rounded-lg p-3">
                          {JSON.stringify(r.meta ?? {}, null, 2)}
                        </pre>
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
