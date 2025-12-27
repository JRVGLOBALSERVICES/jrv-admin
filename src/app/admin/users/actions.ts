"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function addAdminUser(
  email: string,
  role: "admin" | "superadmin"
) {
  // Invite user (or resend invite if exists)
  const { data, error } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (error) throw new Error(error.message);

  const userId = data.user.id;

  // Insert role
  const { error: insertError } =
    await supabaseAdmin.from("admin_users").insert({
      user_id: userId,
      role,
    });

  if (insertError) throw new Error(insertError.message);

  return { ok: true };
}
