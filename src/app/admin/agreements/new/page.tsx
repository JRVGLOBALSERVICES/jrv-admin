import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AgreementForm } from "../_components/AgreementForm";

export default async function NewAgreementPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">{gate.message}</div>
      </div>
    );
  }

  return <AgreementForm mode="create" />;
}
