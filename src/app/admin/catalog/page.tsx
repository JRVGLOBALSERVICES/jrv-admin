import { createSupabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import CatalogClient from "./_components/CatalogClient";

export const metadata: Metadata = pageMetadata({
  title: "Catalog",
  description: "Manage cars catalog, including makes, models, and specifications.",
  path: "/admin/catalog",
  index: false, // ✅ admin pages should not be indexed
});
type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  category: string | null;
  transmission: string | null;
  default_images: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

export default async function CatalogPage() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("car_catalog")
    .select("id, make, model, default_images")
    .eq("is_active", true)
    .order("make", { ascending: true })
    .order("model", { ascending: true })
    .limit(1000);

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vehicle Catalog</h1>
        <p className="text-gray-500 text-sm">Manage the master list of available car makes and models.</p>
      </div>

      <CatalogClient data={data as any[]} />
    </div>
  );
}
