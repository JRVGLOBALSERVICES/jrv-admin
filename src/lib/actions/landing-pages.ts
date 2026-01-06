"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function upsertLandingPage(formData: FormData) {
  const gate = await requireAdmin();
  if (!gate.ok) throw new Error("Unauthorized");

  const supabase = await createSupabaseServer();
  const id = formData.get("id");
  const slug = formData.get("slug") as string;
  const isNew = formData.get("isNew") === "true";
  
  // ... rest of RBAC ...
  
  const payload: any = {
    slug, // Always include slug as it's required and used for conflict check
    menu_label: formData.get("menu_label"),
    category: formData.get("category") || "location",
    status: formData.get("status") || "active",
    
    // SEO
    title: formData.get("title"),
    meta_description: formData.get("meta_description"),
    h1_title: formData.get("h1_title"),
    intro_text: formData.get("intro_text"),
    cta_text: formData.get("cta_text"),
    cta_link: formData.get("cta_link"),

    // Content (JSON Body handled as raw string)
    body_content: safeJson(formData.get("body_content") as string),
    
    // EN
    title_en: formData.get("title_en"),
    meta_description_en: formData.get("meta_description_en"),
    h1_title_en: formData.get("h1_title_en"),
    intro_text_en: formData.get("intro_text_en"),
    cta_text_en: formData.get("cta_text_en"),
    cta_link_en: formData.get("cta_link_en"),
    body_content_en: safeJson(formData.get("body_content_en") as string),
    images: safeJson(formData.get("images") as string),
    image_prompts: safeJson(formData.get("image_prompts") as string),
  };

  if (id) payload.id = id;
  
  const { error } = await supabase
    .from("landing_pages")
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    console.error(error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/landing-pages");
  revalidatePath(`/admin/landing-pages/${slug}`);
  redirect("/admin/landing-pages");
}

export async function deleteLandingPage(id?: string, slug?: string) {
  const gate = await requireAdmin();
  if (!gate.ok) throw new Error("Unauthorized");

  const supabase = await createSupabaseServer();
  
  // Soft delete by setting status to 'deleted' as requested
  let query = supabase.from("landing_pages").update({ status: "deleted" });
  
  if (id) {
    query = query.eq("id", id);
  } else if (slug) {
    query = query.eq("slug", slug);
  } else {
    throw new Error("No identifier provided for deletion");
  }

  const { error } = await query;

  if (error) {
    console.error("Delete Landing Page Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/landing-pages");
  if (slug) revalidatePath(`/admin/landing-pages/${slug}`);
  
  redirect("/admin/landing-pages");
}

function safeJson(str: string) {
    if (!str) return [];
    try {
        return JSON.parse(str);
    } catch {
        return [];
    }
}
