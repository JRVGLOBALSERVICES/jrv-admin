import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { logAdminAction } from "@/lib/audit/log";

type Body = {
  email: string;
  role: "admin" | "superadmin";
  whatsapp?: string; // optional
};

function normalizePhoneToE164MY(phoneRaw?: string) {
  if (!phoneRaw) return null;
  const digits = phoneRaw.replace(/[^\d]/g, "");

  if (digits.startsWith("60")) return `+${digits}`;
  if (digits.startsWith("0")) return `+60${digits.slice(1)}`;
  return `+60${digits}`;
}

function toWaPhoneDigits(e164: string) {
  return e164.replace(/[^\d]/g, "");
}

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok) return NextResponse.json({ error: gate.message }, { status: gate.status });

  const body = (await req.json()) as Body;
  const email = body.email?.trim();
  const role = body.role;
  const whatsappE164 = normalizePhoneToE164MY(body.whatsapp);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  // ✅ Generate invite link (no email delivery needed)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${origin}` },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const userId = data.user?.id;
  const inviteLink = data.properties?.action_link;

  if (!userId || !inviteLink) {
    return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 });
  }

  // ✅ Upsert admin role
  const { error: upsertErr } = await supabaseAdmin
    .from("admin_users")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // ✅ Audit
  await logAdminAction({
    actor_user_id: gate.user.id,
    target_user_id: userId,
    action: "INVITE_ADMIN",
    details: { email, role },
  });

  // WhatsApp message
  const msg =
    `JRV Admin Access\n\n` +
    `You’ve been added as: ${role.toUpperCase()}\n\n` +
    `Open this link to set your password:\n${inviteLink}\n\n` +
    `Login page:\n${origin}`;

  const waUrl = whatsappE164
    ? `https://wa.me/${toWaPhoneDigits(whatsappE164)}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return NextResponse.json({
    ok: true,
    user_id: userId,
    invite_link: inviteLink,
    whatsapp_url: waUrl,
  });
}
