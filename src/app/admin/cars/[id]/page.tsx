import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { CarForm } from "../_components/CarForm";
import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await params;
  if (!id) {
    return pageMetadata({
      title: "Edit Car",
      description: "Edit car details in JRV Admin.",
      path: "/admin/cars",
      index: false,
    });
  }

  const supabase = await createSupabaseServer();

  // ✅ Grab plate + make/model in one query using FK join
  const { data } = await supabase
    .from("cars")
    .select(
      `
      id,
      plate_number,
      car_catalog (
        make,
        model
      )
    `
    )
    .eq("id", id)
    .maybeSingle();
  const plate = (data?.plate_number ?? "").trim();
  const make = (data as any)?.car_catalog?.make ?? "";
  const model = (data as any)?.car_catalog?.model ?? "";

  const namePart = [plate, [make, model].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" - ");

  return pageMetadata({
    title: namePart ? `${namePart}` : "Edit Car",
    description: "Edit car details in JRV Admin.",
    path: `/admin/cars/${id}`,
    index: false,
  });
}

export default async function EditCarPage({
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
        <div className="mt-2 rounded-lg border p-3 text-sm text-red-600">
          {gate.message}
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServer();

  const { data: car, error } = await supabase
    .from("cars")
    .select(
      `
      id,
      plate_number,
      catalog_id,
      status,
      location,
      daily_price,
      price_3_days,
      weekly_price,
      monthly_price,
      deposit,
      body_type,
      seats,
      transmission,
      color,
      primary_image_url,
      images,
      bluetooth,
      smoking_allowed,
      fuel_type,
      aux,
      usb,
      android_auto,
      apple_carplay,
      notes
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !car) return notFound();

  const { data: catalog } = await supabase
    .from("car_catalog")
    .select("id, make, model, default_images") // ✅ IMPORTANT
    .order("make", { ascending: true })
    .order("model", { ascending: true });

  const images = Array.isArray(car.images) ? car.images : [];

  return (
    <CarForm
      mode="edit"
      gateRole={gate.role}
      initial={{ ...car, images }}
      catalog={(catalog ?? []) as any}
    />
  );
}
