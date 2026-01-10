"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

export async function createCatalogEntry(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) throw new Error(gate.message);

  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const default_images = formData.get("default_images") as string;

  if (!make || !model) {
    throw new Error("Make and Model are required.");
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase.from("car_catalog").insert({
    make: make.trim(),
    model: model.trim(),
    default_images: default_images || null,
    is_active: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/catalog");
  return { success: true };
}

export async function updateCatalogEntry(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) throw new Error(gate.message);

  const id = formData.get("id") as string;
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const default_images = formData.get("default_images") as string;

  if (!id || !make || !model) {
    throw new Error("ID, Make and Model are required.");
  }

  const supabase = await createSupabaseServer();

  const payload: any = {
    make: make.trim(),
    model: model.trim(),
  };

  if (default_images) {
    payload.default_images = default_images;
  }

  const { error } = await supabase
    .from("car_catalog")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/catalog");
  return { success: true };
}
