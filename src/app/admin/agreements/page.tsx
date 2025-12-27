import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AgreementsPage() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("agreements")
    .select("id,date_start,date_end,total_price,number_plate,make,model,mobile,status,agreement_url,whatsapp_url")
    .order("date_start", { ascending: false })
    .limit(200);

  if (error) return <div className="text-red-600">{error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Agreements</div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="p-3 text-left">Start</th>
                <th className="p-3 text-left">Plate</th>
                <th className="p-3 text-left">Make / Model</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a: any) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.date_start ? new Date(a.date_start).toLocaleString() : "-"}</td>
                  <td className="p-3">{a.number_plate ?? "-"}</td>
                  <td className="p-3">{(a.make ?? "-") + " / " + (a.model ?? "-")}</td>
                  <td className="p-3">{a.mobile ?? "-"}</td>
                  <td className="p-3">{a.status ?? "-"}</td>
                  <td className="p-3 text-right font-medium">RM {(Number(a.total_price ?? 0)).toLocaleString()}</td>
                </tr>
              ))}
              {!data?.length ? (
                <tr><td className="p-6 text-center opacity-60" colSpan={6}>No agreements found</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs opacity-60">
        Showing latest 200 agreements (optimize later with pagination + filters).
      </div>
    </div>
  );
}
