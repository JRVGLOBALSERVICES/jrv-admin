import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AgreementForm } from "../_components/AgreementForm";

const APP_TZ = "Asia/Kuala_Lumpur";

// ✅ Timezone-safe helper to extract date/time parts from DB Timestamp
function splitIso(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };

  // Use Intl parts in Malaysia timezone (works on Vercel + localhost)
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

export default async function EditAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  const gate = await requireAdmin();
  if (!gate.ok) {
    return <div className="p-6 text-red-600">{gate.message}</div>;
  }

  const supabase = await createSupabaseServer();

  const { data: row, error } = await supabase
    .from("agreements")
    .select(
      `
      id,
      customer_name,
      id_number,
      mobile,
      status,
      car_id,
      date_start,
      date_end,
      total_price,
      deposit_price,
      agreement_url,
      ic_url
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return notFound();

  // ✅ Split timestamps in MYT (not server timezone)
  const startParts = splitIso(row.date_start);
  const endParts = splitIso(row.date_end);

  return (
    <AgreementForm
      mode="edit"
      initial={{
        id: row.id,
        customer_name: row.customer_name ?? "",
        id_number: row.id_number ?? "",
        mobile: row.mobile ?? "",
        status: row.status ?? "New",
        car_id: row.car_id ?? "",

        date_start: startParts.date,
        start_time: startParts.time,
        date_end: endParts.date,
        end_time: endParts.time,

        total_price: row.total_price ?? "0",
        deposit_price: row.deposit_price ?? "0",
        agreement_url: row.agreement_url ?? null,
        ic_url: row.ic_url ?? null, // ✅ PASSING IT DOWN
      }}
    />
  );
}
