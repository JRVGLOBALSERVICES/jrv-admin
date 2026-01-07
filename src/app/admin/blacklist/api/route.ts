import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

// GET: Fetch all
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data });
}

// POST: Create New
export async function POST(req: Request) {
  try {
      const gate = await requireAdmin();
      if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const { type, value, reason } = body;

      // Sanitize
      const cleanValue = String(value || "").trim().replace(/[^a-zA-Z0-9+]/g, "");

      const supabase = await createSupabaseServer();
      const { error } = await supabase.from("blacklist").insert({
          type, 
          value: cleanValue, 
          reason
      });

      if (error) throw error;
      return NextResponse.json({ ok: true });
  } catch(e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update
export async function PUT(req: Request) {
    try {
        const gate = await requireAdmin();
        if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
        const body = await req.json();
        const { id, type, value, reason } = body;
  
        // Sanitize
        const cleanValue = String(value || "").trim().replace(/[^a-zA-Z0-9+]/g, "");
  
        const supabase = await createSupabaseServer();
        const { error } = await supabase.from("blacklist").update({
            type, 
            value: cleanValue, 
            reason
        }).eq('id', id);
  
        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE: Remove
export async function DELETE(req: Request) {
    try {
        const gate = await requireAdmin();
        if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if(!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = await createSupabaseServer();
        const { error } = await supabase.from("blacklist").delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
