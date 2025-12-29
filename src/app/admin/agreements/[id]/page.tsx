import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AgreementForm } from "../_components/AgreementForm";

// ✅ Helper to extract date/time parts from DB Timestamp
function splitIso(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${mins}`,
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
      agreement_url
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return notFound();

  // ✅ Use helper to split timestamps
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
        
        // Pass split parts
        date_start: startParts.date,
        start_time: startParts.time,
        date_end: endParts.date,
        end_time: endParts.time,

        total_price: row.total_price ?? "0",
        deposit_price: row.deposit_price ?? "0",
        agreement_url: row.agreement_url ?? null,
      }}
    />
  );
}