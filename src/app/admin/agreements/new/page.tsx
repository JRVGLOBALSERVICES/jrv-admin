import { requireAdmin } from "@/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { AgreementForm } from "../_components/AgreementForm";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create New Agreements",
  description:
    "Create new agreements",
  path: "/admin/agreements/new",
  index: false,
});

export default async function NewAgreementPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.status === 401) redirect("/");
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Forbidden</div>
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">{gate.message}</div>
      </div>
    );
  }

  return <AgreementForm mode="create" />;
}