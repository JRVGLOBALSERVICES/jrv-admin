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
    const repo = "JRVGLOBALSERVICES/jrvservices_front";
    const workflowFile = "scrape_images.yml";
    const ref = "main";

    if (!process.env.GITHUB_PAT) {
      console.error(
        "[SCRAPER] CRITICAL: Missing GITHUB_PAT environment variable. Cannot trigger GitHub Action."
      );
      return;
    }

    console.log(
      `[SCRAPER] Dispatching workflow for: ${targetUrl || "Discovery Scan"}`
    );

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
      console.error(`[SCRAPER] GitHub API Error (${res.status}):`, txt);
    } else {
      console.log(
        `[SCRAPER] ✅ Successfully triggered GitHub Action for ${
          targetUrl || "Global Scan"
        }`
      );
    }
  } catch (e) {
    console.error(
      "[SCRAPER] Critical exception during triggerImageExtraction:",
      e
    );
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
      console.log("[POST API] Creating post, payload:", payload);
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
      if (error) {
        console.error("[POST API] Create error:", error);
        throw error;
      }
      await logMarketing(actorEmail, "create_post", { title: payload.title });

      // Auto-fetch image for new post (triggers background scrapper)
      if (insertPayload.content_url) {
        if (!process.env.GITHUB_PAT) {
          console.warn(
            "[POST API] Post created but GITHUB_PAT is missing - extraction will NOT trigger."
          );
        } else {
          console.log(
            "[POST API] Triggering extraction for new post:",
            insertPayload.content_url
          );
          await triggerImageExtraction(insertPayload.content_url);
        }
      }

      return NextResponse.json({
        ok: true,
        data,
        github_pat_missing: !process.env.GITHUB_PAT,
      });
    }

    if (action === "update") {
      const { id, ...updates } = payload;
      console.log("[POST API] Updating post:", id, "updates:", updates);

      // If user cleared image_url or it was never there, mark as EXTRACTING
      if (
        updates.content_url &&
        (!updates.image_url || updates.image_url === "")
      ) {
        console.log("[POST API] Marking as EXTRACTING for update");
        updates.image_url = "EXTRACTING";
      }

      const { error } = await supabase
        .from("fb_posts")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("[POST API] Update error:", error);
        throw error;
      }
      await logMarketing(actorEmail, "update_post", { id, updates });

      // Auto-fetch image ONLY if it's currently marked as EXTRACTING
      if (updates.content_url && updates.image_url === "EXTRACTING") {
        if (!process.env.GITHUB_PAT) {
          console.warn(
            "[POST API] Post updated but GITHUB_PAT is missing - extraction will NOT trigger."
          );
        } else {
          console.log(
            "[POST API] Triggering extraction for update:",
            updates.content_url
          );
          await triggerImageExtraction(updates.content_url);
        }
      }

      return NextResponse.json({
        ok: true,
        github_pat_missing: !process.env.GITHUB_PAT,
      });
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
