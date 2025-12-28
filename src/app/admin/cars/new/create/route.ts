import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "../../../../../lib/auth/requireAdmin";

function cleanUrl(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function normalizeImages(input: any): string[] {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = arr.map((x) => String(x ?? "").trim()).filter(Boolean);
  return cleaned.slice(0, 4);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();

  const images = normalizeImages(body.images);
  const primary = cleanUrl(body.primary_image_url) ?? (images[0] ? images[0] : null);

  const row = {
    plate_number: String(body.plate_number ?? "").trim(),
    catalog_id: body.catalog_id ?? null,
    body_type: body.body_type ?? null,
    seats: body.seats == null || body.seats === "" ? null : Number(body.seats),
    transmission: body.transmission ?? null,
    color: body.color ?? null,
    primary_image_url: primary,
    images,
    status: body.status ?? "active",
    location: body.location ?? null,
    daily_price: body.daily_price == null || body.daily_price === "" ? null : Number(body.daily_price),
    deposit: body.deposit == null || body.deposit === "" ? null : Number(body.deposit),
  };

  if (!row.plate_number) return NextResponse.json({ error: "plate_number required" }, { status: 400 });
  if (!row.catalog_id) return NextResponse.json({ error: "catalog_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("cars")
    .insert(row)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: data.id });
}
