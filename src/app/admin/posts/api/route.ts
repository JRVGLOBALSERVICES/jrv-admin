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

async function triggerImageExtraction(targetUrl?: string) {
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
          inputs: {
            target_url: targetUrl || "",
          },
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error("Failed to trigger GitHub Action:", res.status, txt);
    } else {
      console.log(
        `🚀 Triggered GitHub Action: scrape_images ${
          targetUrl ? `for ${targetUrl}` : "(global scan)"
        }`
      );
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
    if (action === "extract") {
      const { url } = payload;
      if (!url)
        return NextResponse.json({ error: "URL missing" }, { status: 400 });

      // Lightweight extraction for immediate UI feedback (Googlebot Strategy)
      const scrapingRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      });
      const html = await scrapingRes.text();

      // Simple regex for og:image
      const match =
        html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
        );

      let image = match ? match[1] : null;

      // Decode HTML entities if found
      if (image) image = image.replace(/&amp;/g, "&");

      return NextResponse.json({ ok: true, image });
    }

    if (action === "create") {
      // If no image_url, mark it as EXTRACTING
      const insertPayload = {
        ...payload,
        image_url: payload.image_url || "EXTRACTING",
      };

      const { data, error } = await supabase
        .from("fb_posts")
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      await logMarketing(actorEmail, "create_post", { title: payload.title });

      // Auto-fetch image for new post (triggers background scrapper)
      if (insertPayload.content_url) {
        await triggerImageExtraction(insertPayload.content_url);
      }

      return NextResponse.json({ ok: true, data });
    }

    if (action === "update") {
      const { id, ...updates } = payload;

      // If user cleared image_url or it was never there, mark as EXTRACTING
      if (
        updates.content_url &&
        (!updates.image_url || updates.image_url === "")
      ) {
        updates.image_url = "EXTRACTING";
      }

      const { error } = await supabase
        .from("fb_posts")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await logMarketing(actorEmail, "update_post", { id, updates });

      // Auto-fetch image ONLY if it's currently marked as EXTRACTING
      if (updates.content_url && updates.image_url === "EXTRACTING") {
        await triggerImageExtraction(updates.content_url);
      }

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
