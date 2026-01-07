import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, content, prompt, context } = await req.json();
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase.from("marketing_assets").insert({
        type,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        prompt,
        context: context || {},
        created_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ ok: true, asset: data });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = await createSupabaseServer();
    const { error } = await supabase.from("marketing_assets").delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
