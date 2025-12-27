import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  email: string;
  role: "admin" | "superadmin";
  whatsapp?: string; // optional phone input
};

function normalizePhoneToE164MY(phoneRaw?: string) {
  if (!phoneRaw) return null;

  // keep digits only
  const digits = phoneRaw.replace(/[^\d]/g, "");

  // Already has country code (starts with 60...)
  if (digits.startsWith("60")) return `+${digits}`;

  // Starts with 0 (malaysia local)
  if (digits.startsWith("0")) return `+60${digits.slice(1)}`;

  // Otherwise treat as MY without leading 0
  return `+60${digits}`;
}

function toWaPhoneDigits(e164: string) {
  return e164.replace(/[^\d]/g, "");
}

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok)
    return NextResponse.json({ error: gate.message }, { status: gate.status });

  const body = (await req.json()) as Body;
  const email = body.email?.trim();
  const role = body.role;
  const whatsappE164 = normalizePhoneToE164MY(body.whatsapp);

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 }
    );
  }
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Generate invite link (no email required)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/admin/login`,
    },
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  const userId = data.user?.id;
  const inviteLink = data.properties?.action_link;

  if (!userId || !inviteLink) {
    return NextResponse.json(
      { error: "Failed to generate invite link" },
      { status: 500 }
    );
  }

  // Upsert admin role
  const { error: upsertErr } = await supabaseAdmin
    .from("admin_users")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });

  if (upsertErr)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // WhatsApp message
  const msg =
    `JRV Admin Access\n\n` +
    `You’ve been added as: ${role.toUpperCase()}\n\n` +
    `Open this link to set your password and login:\n` +
    `${inviteLink}\n\n` +
    `After setting password, login here:\n` +
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin/login`;

  const waUrl = whatsappE164
    ? `https://wa.me/${toWaPhoneDigits(whatsappE164)}?text=${encodeURIComponent(
        msg
      )}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return NextResponse.json({
    ok: true,
    user_id: userId,
    invite_link: inviteLink,
    whatsapp_url: waUrl,
  });
}
