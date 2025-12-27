import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

type Row = {
  id: string;
  mobile: string | null;
  id_number: string | null;
  date_start: string | null;
  date_end: string | null;
  booking_duration_days: number | null;
  total_price: number | null;
  deposit_price: number | null;
  status: string | null;
  agreement_url: string | null;
  whatsapp_url: string | null;
  number_plate: string | null;

  // ✅ you said you added this back
  car_type: string | null;

  cars: Array<{
    id: string;
    plate_number: string | null;
    car_catalog: Array<{
      make: string | null;
      model: string | null;
    }>;
  }>;
};

function getPlate(r: Row) {
  const car = r.cars?.[0] ?? null;

  const p1 = (car?.plate_number ?? "").trim();
  if (p1) return p1;

  const p2 = (r.number_plate ?? "").trim();
  if (p2) return p2;

  return "—";
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  return `RM ${Number(v).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
  })}`;
}

function normPhone(v?: string | null) {
  if (!v) return "—";
  const s = v.trim();
  if (!s) return "—";
  if (s.startsWith("+")) return s;
  if (s.startsWith("60")) return `+${s}`;
  if (s.startsWith("0")) return `+6${s}`;
  return s;
}

function getCarLabel(r: Row) {
  const car = r.cars?.[0] ?? null;
  const catalog = car?.car_catalog?.[0] ?? null;

  const make = (catalog?.make ?? "").trim();
  const model = (catalog?.model ?? "").trim();

  // ✅ Primary: catalog make/model
  const labelFromCatalog = [make, model].filter(Boolean).join(" ").trim();
  if (labelFromCatalog) return labelFromCatalog;

  // ✅ Fallback: agreements.car_type
  const ct = (r.car_type ?? "").trim();
  if (ct) return ct;

  return "Unknown";
}

export default async function AgreementsPage() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("agreements")
    .select(
      `
      id, mobile, id_number, date_start, date_end, booking_duration_days,
      total_price, deposit_price, status, agreement_url, whatsapp_url, number_plate,
      car_type,
      cars:car_id (
        id, plate_number,
        car_catalog:catalog_id ( make, model )
      )
    `
    )
    .order("date_start", { ascending: false })
    .order("date_end", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Agreements</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {error.message}
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Agreements</div>
          <div className="text-sm opacity-70">
            Sorted by start/end date. Car label falls back to car_type.
          </div>
        </div>

        <Link
          href="/admin/agreements/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 active:scale-[0.98]"
        >
          + New
        </Link>
      </div>

      {/* Mobile */}
      <div className="grid gap-3 md:hidden">
        {rows.map((r) => {
          const car = r.cars?.[0] ?? null;
          const plate = getPlate(r);
          const carLabel = getCarLabel(r);

          return (
            <div
              key={r.id}
              className="rounded-xl border bg-white p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{plate}</div>
                  <div className="text-sm opacity-70 truncate">{carLabel}</div>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">
                  {r.status ?? "—"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[11px] opacity-60">Start</div>
                  <div>{fmtDate(r.date_start)}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">End</div>
                  <div>{fmtDate(r.date_end)}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">Customer</div>
                  <div className="truncate">{normPhone(r.mobile)}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">Total</div>
                  <div>{fmtMoney(r.total_price)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {r.agreement_url ? (
                  <a
                    className="text-sm underline"
                    target="_blank"
                    href={r.agreement_url}
                    rel="noreferrer"
                  >
                    Agreement
                  </a>
                ) : (
                  <span className="text-sm opacity-60">No agreement</span>
                )}

                {r.whatsapp_url ? (
                  <a
                    className="text-sm underline"
                    target="_blank"
                    href={r.whatsapp_url}
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}

                <Link
                  href={`/admin/agreements/${r.id}`}
                  className="text-sm underline"
                >
                  View/Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/[0.03]">
            <tr className="text-left">
              <th className="p-3">Plate</th>
              <th className="p-3">Model</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Links</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const car = r.cars?.[0] ?? null;
              const plate = getPlate(r);
              const carLabel = getCarLabel(r);

              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{plate}</td>
                  <td className="p-3">{carLabel}</td>
                  <td className="p-3">{fmtDate(r.date_start)}</td>
                  <td className="p-3">{fmtDate(r.date_end)}</td>
                  <td className="p-3">{normPhone(r.mobile)}</td>
                  <td className="p-3">{fmtMoney(r.total_price)}</td>
                  <td className="p-3">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {r.status ?? "—"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      {r.agreement_url ? (
                        <a
                          className="underline"
                          target="_blank"
                          href={r.agreement_url}
                          rel="noreferrer"
                        >
                          Agreement
                        </a>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                      {r.whatsapp_url ? (
                        <a
                          className="underline"
                          target="_blank"
                          href={r.whatsapp_url}
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <Link
                      className="underline"
                      href={`/admin/agreements/${r.id}`}
                    >
                      View/Edit
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!rows.length ? (
              <tr>
                <td className="p-6 opacity-60" colSpan={9}>
                  No agreements found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
