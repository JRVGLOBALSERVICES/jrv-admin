import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function logMarketing(actorEmail: string, action: string, details: any) {
  await supabaseAdmin.from("marketing_logs").insert({
    actor_email: actorEmail,
    action,
    details,
  });
}

async function triggerImageExtraction() {
  try {
    // Trigger the Vercel cron function on the live site
    // We use a limit of 10 to cover a few recent additions
    const res = await fetch(
      "https://jrvservices.co/api/cron/update_fb_images?limit=10"
    );
    if (!res.ok) console.error("Failed to trigger extraction:", res.status);
    else console.log("Triggered FB image extraction via Cron API");
  } catch (e) {
    console.error("Error triggering extraction:", e);
  }
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok)
    return NextResponse.json({ error: gate.message }, { status: gate.status });

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("fb_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok)
    return NextResponse.json({ error: gate.message }, { status: gate.status });

  const body = await req.json();
  const { action, payload } = body;

  // Use supabaseAdmin to ensure we can write freely
  const supabase = supabaseAdmin;

  // Resolve actor email
  let actorEmail = "unknown";
  if ("email" in gate) {
    // @ts-ignore
    actorEmail = gate.email;
  } else {
    // fallback if your requireAdmin doesn't return email, fetch it
    const { data } = await (await createSupabaseServer()).auth.getUser();
    actorEmail = data.user?.email || "unknown";
  }

  try {
    if (action === "create") {
      const { data, error } = await supabase
        .from("fb_posts")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await logMarketing(actorEmail, "create_post", { title: payload.title });

      // Auto-fetch image
      await triggerImageExtraction();

      return NextResponse.json({ ok: true, data });
    }

    if (action === "update") {
      const { id, ...updates } = payload;
      const { error } = await supabase
        .from("fb_posts")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await logMarketing(actorEmail, "update_post", { id, updates });

      // Auto-fetch image (in case URL changed)
      await triggerImageExtraction();

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const { id } = payload;
      const { error } = await supabase.from("fb_posts").delete().eq("id", id);
      if (error) throw error;
      await logMarketing(actorEmail, "delete_post", { id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
