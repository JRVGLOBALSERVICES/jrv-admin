import { createSupabaseServer } from "@/lib/supabase/server";

function cleanPlate(v: any): string {
  const s = String(v ?? "").trim();
  return s ? s.replace(/\s+/g, " ").replace(/[<>]/g, "").toUpperCase() : "-";
}

function cleanPhone(v: any): string {
  const s = String(v ?? "").replace(/[<>]/g, "").trim();
  if (!s) return "-";
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  return s.replace(/\D/g, "");
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default async function AgreementsPage() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("agreements")
    .select(
      "id,updated_at,date_start,date_end,total_price,number_plate,make,model,mobile,status,agreement_url,whatsapp_url,car_type"
    )
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) return <div className="text-red-600">{error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Agreements</div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="p-3 text-left">Updated</th>
                <th className="p-3 text-left">Plate</th>
                <th className="p-3 text-left">Make / Model</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-left">Links</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a: any) => (
                <tr key={a.id} className="border-t align-top">
                  <td className="p-3">{fmtDate(a.updated_at ?? a.date_start ?? a.created_at)}</td>
                  <td className="p-3">{cleanPlate(a.number_plate)}</td>
                  <td className="p-3">
                    {(a.make ?? "-") + " / " + (a.model ?? "-")}
                    {(!a.make || !a.model) && a.car_type ? (
                      <div className="text-xs opacity-60 mt-1">Legacy: {a.car_type}</div>
                    ) : null}
                  </td>
                  <td className="p-3">{cleanPhone(a.mobile)}</td>
                  <td className="p-3">{a.status ?? "-"}</td>
                  <td className="p-3 text-right font-medium">RM {Number(a.total_price ?? 0).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 text-xs">
                      {a.agreement_url ? (
                        <a className="underline" href={a.agreement_url} target="_blank" rel="noreferrer">
                          Agreement
                        </a>
                      ) : (
                        <span className="opacity-50">No agreement_url</span>
                      )}

                      {a.whatsapp_url ? (
                        <a className="underline" href={a.whatsapp_url} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      ) : (
                        <span className="opacity-50">No whatsapp_url</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!data?.length ? (
                <tr>
                  <td className="p-6 text-center opacity-60" colSpan={7}>
                    No agreements found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs opacity-60">
        Showing latest 200 agreements (sorted by updated_at).
      </div>
    </div>
  );
}
