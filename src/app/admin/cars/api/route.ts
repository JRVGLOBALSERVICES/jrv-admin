import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { carAuditLog } from "@/lib/audit/carAudit";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type CarPayload = {
  id?: string;

  plate_number: string;
  catalog_id: string;

  status: string;
  location: string;

  daily_price: number | null;
  price_3_days: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  deposit: number | null;

  body_type: string | null;
  seats: number | null;
  transmission: string | null;
  color: string | null;

  primary_image_url: string | null;
  images: string[];

  bluetooth: boolean;
  smoking_allowed: boolean;
  fuel_type: string | null;
  aux: boolean;
  usb: boolean;
  android_auto: boolean;
  apple_carplay: boolean;

  notes?: string | null;
};

const toNumOrNull = (v: any) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildCarLabel = (make?: any, model?: any) => {
  const a = String(make ?? "").trim();
  const b = String(model ?? "").trim();
  return [a, b].filter(Boolean).join(" ").trim();
};

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const url = new URL(req.url);
  const mode = String(url.searchParams.get("mode") ?? "").trim();

  if (mode !== "dropdown") return jsonError("Unknown mode", 400);

  const { data, error } = await supabaseAdmin
    .from("cars")
    .select(
      `
      id,
      plate_number,
      catalog_id,
      catalog:catalog_id ( make, model )
    `
    )
    .order("plate_number", { ascending: true })
    .limit(5000);

  if (error) return jsonError(error.message, 500);

  const rows = (data ?? [])
    .map((c: any) => {
      const plate = String(c?.plate_number ?? "").trim();
      if (!plate) return null;

      const car_label = buildCarLabel(c?.catalog?.make, c?.catalog?.model);

      return {
        id: c.id,
        plate_number: plate,
        catalog_id: c?.catalog_id ?? null,
        car_label,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const actorId = gate.id;
  const actorRole = gate.role;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Missing SUPABASE_SERVICE_ROLE_KEY on server", 500);
  }

  const body = (await req.json()) as any;
  const action = String(body?.action ?? "");

  if (action === "delete") {
    if (actorRole !== "superadmin") return jsonError("Forbidden", 403);

    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("Missing car id");

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("cars")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (beforeErr) return jsonError(beforeErr.message, 400);
    if (!before) return jsonError("Car not found", 404);

    const { error: delErr } = await supabaseAdmin.from("cars").delete().eq("id", id);
    if (delErr) return jsonError(delErr.message, 400);

    await carAuditLog({
      actor_user_id: actorId,
      action: "DELETE_CAR",
      car_id: id,
      meta: { before },
    });

    return NextResponse.json({ ok: true });
  }

  const payload = body?.payload as CarPayload | undefined;
  if (!payload) return jsonError("Missing payload");

  const clean: CarPayload = {
    id: payload.id ? String(payload.id) : undefined,

    plate_number: String(payload.plate_number ?? "").trim(),
    catalog_id: String(payload.catalog_id ?? "").trim(),

    status: String(payload.status ?? "available"),
    location: String(payload.location ?? "Seremban"),

    daily_price: toNumOrNull(payload.daily_price),
    price_3_days: toNumOrNull(payload.price_3_days),
    weekly_price: toNumOrNull(payload.weekly_price),
    monthly_price: toNumOrNull(payload.monthly_price),
    deposit: toNumOrNull(payload.deposit),

    body_type: payload.body_type ?? null,
    seats: payload.seats == null ? null : Number(payload.seats),
    transmission: payload.transmission ?? null,
    color: payload.color ?? null,

    primary_image_url: payload.primary_image_url ?? null,
    images: Array.isArray(payload.images) ? payload.images.slice(0, 4) : [],

    bluetooth: !!payload.bluetooth,
    smoking_allowed: !!payload.smoking_allowed,
    fuel_type: payload.fuel_type ?? null,
    aux: !!payload.aux,
    usb: !!payload.usb,
    android_auto: !!payload.android_auto,
    apple_carplay: !!payload.apple_carplay,

    notes: payload.notes ?? null,
  };

  if (!clean.plate_number) return jsonError("Plate number required");
  if (!clean.catalog_id) return jsonError("Catalog (make/model) required");

  try {
    if (action === "create") {
      const now = new Date().toISOString();

      const { data: created, error: insErr } = await supabaseAdmin
        .from("cars")
        .insert({
          ...clean,
          updated_at: now,
        })
        .select("id")
        .maybeSingle();

      if (insErr) return jsonError(insErr.message, 400);

      await carAuditLog({
        actor_user_id: actorId,
        action: "CREATE_CAR",
        car_id: created?.id ?? null,
        meta: {
          after: {
            ...clean,
            id: created?.id ?? null,
          },
        },
      });

      return NextResponse.json({ ok: true, id: created?.id ?? null });
    }

    if (action === "update") {
      if (!clean.id) return jsonError("Missing car id");

      const { data: before, error: beforeErr } = await supabaseAdmin
        .from("cars")
        .select("*")
        .eq("id", clean.id)
        .maybeSingle();

      if (beforeErr) return jsonError(beforeErr.message, 400);
      if (!before) return jsonError("Car not found", 404);

      const now = new Date().toISOString();

      const { data: after, error: updErr } = await supabaseAdmin
        .from("cars")
        .update({
          ...clean,
          updated_at: now,
        })
        .eq("id", clean.id)
        .select("*")
        .maybeSingle();

      if (updErr) return jsonError(updErr.message, 400);

      await carAuditLog({
        actor_user_id: actorId,
        action: "UPDATE_CAR",
        car_id: clean.id,
        meta: { before, after },
      });

      return NextResponse.json({ ok: true });
    }

    return jsonError("Unknown action");
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
