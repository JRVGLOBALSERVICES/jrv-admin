import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .order("created_at", { ascending: false });
  return NextResponse.json({ ok: !error, rows: data });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === "create") {
    // ✅ Fix: Sanitize input before saving
    // Keeps only alphanumeric chars (removes dashes, spaces, etc.)
    const raw = String(body.value || "").trim();

    // For phones/ICs, usually better to store them 'clean' so searches are easier
    // But we will store what the user entered if it's mixed,
    // or just strip spaces/dashes to be safe.
    // Let's strip spaces/dashes for consistency moving forward.
    const cleanValue = raw.replace(/[^a-zA-Z0-9+]/g, "");

    const { error } = await supabase.from("blacklist").insert({
      type: body.type,
      value: cleanValue,
      reason: body.reason,
    });
    return NextResponse.json({ ok: !error });
  }

  if (body.action === "delete") {
    const { error } = await supabase
      .from("blacklist")
      .delete()
      .eq("id", body.id);
    return NextResponse.json({ ok: !error });
  }

  return NextResponse.json({ error: "Invalid action" });
}
