import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AgreementForm } from "../_components/AgreementForm";

export default async function EditAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">{gate.message}</div>
      </div>
    );
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
      booking_duration_days,
      total_price,
      deposit_price,
      agreement_url
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return notFound();

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
        date_start: row.date_start ?? "",
        date_end: row.date_end ?? "",
        total_price: row.total_price ?? "0",
        deposit_price: row.deposit_price ?? "0",
        agreement_url: row.agreement_url ?? null,
      }}
    />
  );
}
