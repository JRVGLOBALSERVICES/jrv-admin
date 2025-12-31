import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

type Role = "admin" | "superadmin";
type Status = "active" | "disabled";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Audit helper (never throws) */
async function audit(
  actorId: string,
  action: string,
  targetUserId?: string,
  meta?: any
) {
  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    actor_user_id: actorId,
    action,
    target_user_id: targetUserId ?? null,
    meta: meta ?? null,
  });

  if (error) {
    console.error("AUDIT LOG FAILED:", {
      action,
      actorId,
      targetUserId,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
    });
  }
}

/**
 * GET  -> list admin users
 * POST -> action-based mutations
 */
export async function GET() {
  const gate = await requireSuperadmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,email,phone,role,status,created_at,created_by")
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  // ✅ FIX: use actorId (gate is narrowed)
  const actorId = gate.id;

  const body = (await req.json()) as any;
  const action = String(body?.action ?? "");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Missing SUPABASE_SERVICE_ROLE_KEY on server", 500);
  }

  const getTarget = async (userId: string) => {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("user_id,role,status,email,phone")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return data as {
      user_id: string;
      role: Role;
      status: Status;
      email?: string | null;
      phone?: string | null;
    } | null;
  };

  try {
    // ========== CREATE ==========
    if (action === "create") {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      const phone = String(body.phone ?? "").trim() || null;
      const role = (body.role as Role) ?? "admin";
      const tempPassword = String(body.tempPassword ?? "");

      if (!email) return jsonError("Email required");
      if (!tempPassword || tempPassword.length < 6)
        return jsonError("Temp password must be 6+ chars");
      if (role !== "admin" && role !== "superadmin")
        return jsonError("Invalid role");

      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });

      if (createErr || !created.user)
        return jsonError(createErr?.message || "Failed to create user", 400);

      const { error: insErr } = await supabaseAdmin.from("admin_users").insert({
        user_id: created.user.id,
        email,
        phone,
        role,
        status: "active",
        created_by: actorId, // ✅ FIXED
      });

      if (insErr) {
        await supabaseAdmin.auth.admin
          .deleteUser(created.user.id)
          .catch(() => {});
        return jsonError(insErr.message, 400);
      }

      await audit(actorId, "CREATE_ADMIN", created.user.id, {
        email,
        phone,
        role,
        temp_password_set: true,
      });

      return NextResponse.json({ ok: true });
    }

    // ========== UPDATE ==========
    if (action === "update") {
      const user_id = String(body.user_id ?? "");
      const role = body.role as Role | undefined;
      const phone =
        typeof body.phone === "string" ? body.phone.trim() : undefined;
      const status = body.status as Status | undefined;

      if (!user_id) return jsonError("user_id required");

      const target = await getTarget(user_id);
      if (!target) return jsonError("Target not found", 404);

      if (user_id === actorId)
        return jsonError("You cannot edit yourself here", 403);
      if (target.role === "superadmin")
        return jsonError("Cannot modify another superadmin", 403);

      const patch: any = {};
      if (role) {
        if (role !== "admin" && role !== "superadmin")
          return jsonError("Invalid role");
        patch.role = role;
      }
      if (phone !== undefined) patch.phone = phone || null;
      if (status) {
        if (status !== "active" && status !== "disabled")
          return jsonError("Invalid status");
        patch.status = status;
      }

      if (!Object.keys(patch).length) return jsonError("Nothing to update");

      const { error } = await supabaseAdmin
        .from("admin_users")
        .update(patch)
        .eq("user_id", user_id);

      if (error) return jsonError(error.message, 400);

      await audit(actorId, "UPDATE_ADMIN", user_id, {
        ...patch,
        prev: {
          role: target.role,
          status: target.status,
          phone: target.phone ?? null,
          email: target.email ?? null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // ========== SET PASSWORD ==========
    if (action === "set_password") {
      const user_id = String(body.user_id ?? "");
      const newPassword = String(body.newPassword ?? "");

      if (!user_id) return jsonError("user_id required");
      if (!newPassword || newPassword.length < 6)
        return jsonError("Password must be 6+ chars");

      const target = await getTarget(user_id);
      if (!target) return jsonError("Target not found", 404);

      if (user_id === actorId)
        return jsonError("You cannot change your own password here", 403);
      if (target.role === "superadmin")
        return jsonError("Cannot change another superadmin password", 403);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: newPassword,
      });
      if (error) return jsonError(error.message, 400);

      await audit(actorId, "SET_PASSWORD", user_id, {
        email: target.email ?? null,
      });

      return NextResponse.json({ ok: true });
    }

    // ========== TOGGLE ==========
    if (action === "toggle") {
      const user_id = String(body.user_id ?? "");
      const enable = Boolean(body.enable);

      if (!user_id) return jsonError("user_id required");

      const target = await getTarget(user_id);
      if (!target) return jsonError("Target not found", 404);

      if (user_id === actorId)
        return jsonError("You cannot disable yourself", 403);
      if (target.role === "superadmin")
        return jsonError("Cannot disable another superadmin", 403);

      const nextStatus: Status = enable ? "active" : "disabled";

      const { error } = await supabaseAdmin
        .from("admin_users")
        .update({ status: nextStatus })
        .eq("user_id", user_id);

      if (error) return jsonError(error.message, 400);

      await audit(actorId, enable ? "ENABLE_ADMIN" : "DISABLE_ADMIN", user_id, {
        prev_status: target.status,
        next_status: nextStatus,
        email: target.email ?? null,
      });

      return NextResponse.json({ ok: true });
    }

    // ========== DELETE ==========
    if (action === "delete") {
      const user_id = String(body.user_id ?? "");
      if (!user_id) return jsonError("user_id required");

      const target = await getTarget(user_id);
      if (!target) return jsonError("Target not found", 404);

      if (user_id === actorId)
        return jsonError("You cannot delete yourself", 403);
      if (target.role === "superadmin")
        return jsonError("Cannot delete another superadmin", 403);

      await audit(actorId, "DELETE_ADMIN", user_id, {
        email: target.email ?? null,
        role: target.role ?? null,
        status: target.status ?? null,
        phone: target.phone ?? null,
      });

      await supabaseAdmin
        .from("admin_audit_logs")
        .delete()
        .or(`actor_user_id.eq.${user_id},target_user_id.eq.${user_id}`);

      await supabaseAdmin
        .from("car_audit_logs")
        .delete()
        .eq("actor_user_id", user_id);

      const { error: delRowErr } = await supabaseAdmin
        .from("admin_users")
        .delete()
        .eq("user_id", user_id);
      if (delRowErr) return jsonError(delRowErr.message, 400);

      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(
        user_id
      );
      if (delAuthErr) return jsonError(delAuthErr.message, 400);

      return NextResponse.json({ ok: true });
    }

    return jsonError("Unknown action");
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
