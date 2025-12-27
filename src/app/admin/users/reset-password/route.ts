import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";

type Body = { email: string };

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const { email } = (await req.json()) as Body;
  const cleanEmail = email?.trim();
  if (!cleanEmail) return NextResponse.json({ error: "email required" }, { status: 400 });

  const origin = 'https://jrv-admin.vercel.app';

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo: `https://jrv-admin.vercel.app` },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resetLink = data.properties?.action_link;
  if (!resetLink) return NextResponse.json({ error: "Failed to generate reset link" }, { status: 500 });

  await logAdminAction({
    actor_user_id: gate.user.id,
    target_user_id: null,
    action: "RESET_PASSWORD_LINK",
    details: { email: cleanEmail },
  });

  const message =
    `JRV Admin Password Reset\n\n` +
    `Tap the link below to set a new password:\n${resetLink}\n\n` +
    `Login page:\n${origin}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    ok: true,
    reset_link: resetLink,
    whatsapp_url: whatsappUrl,
  });
}
