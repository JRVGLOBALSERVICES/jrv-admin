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
    // TRIGGER GITHUB ACTION (Bypasses Vercel IP Limits)
    // Repo: JRVGLOBALSERVICES/jrvservices_front
    const repo = "JRVGLOBALSERVICES/jrvservices_front";
    const workflowFile = "scrape_images.yml";
    const ref = "main"; // or master, depending on your default branch

    if (!process.env.GITHUB_PAT) {
      console.warn("Missing GITHUB_PAT. Cannot trigger GitHub Action.");
      return;
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: ref,
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error("Failed to trigger GitHub Action:", res.status, txt);
    } else {
      console.log("🚀 Triggered GitHub Action: scrape_images");
    }
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
