import { createSupabaseServer } from "@/lib/supabase/server";
import CarsTable from "./_components/CarsTable";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cars",
  description: "Manage cars, pricing, images, and availability.",
  path: "/admin/cars",
  index: false,
});

export type CarListRow = {
  id: string;
  plate_number: string | null;
  status: string | null;
  location: string | null;
  body_type: string | null;

  daily_price: number | null;
  price_3_days: number | null;
  weekly_price: number | null;
  monthly_price: number | null;

  primary_image_url: string | null;
  images: string[] | null;

  car_catalog: { make: string | null; model: string | null } | null;
};

export default async function CarsPage() {
  const gate = await requireAdmin();
  if (!gate.ok)
    return <div className="p-6 text-sm text-red-600">{gate.message}</div>;

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("cars")
    .select(
      `
      id, plate_number, status, location, body_type,
      daily_price, price_3_days, weekly_price, monthly_price,
      primary_image_url, images,
      car_catalog:catalog_id ( make, model )
    `
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error.message}</div>;
  }

  return <CarsTable rows={(data ?? []) as unknown as CarListRow[]} />;
}
