import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        return NextResponse.json({ user: null, role: null }, { status: 401 });
    }

    const { data: row, error } = await supabase
        .from("admin_users")
        .select("role,status,email")
        .eq("user_id", data.user.id)
        .maybeSingle();
console.log(row)
    return NextResponse.json({
        user: { id: data.user.id, email: data.user.email },
        role: row?.role ?? null,
        status: row?.status ?? null,
        db_error: error?.message ?? null,
    });
}
