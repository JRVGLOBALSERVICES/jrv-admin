import { NextResponse } from "next/server";
import { createElement } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { normalizePhoneInternational, buildWhatsAppUrl } from "@/lib/phone";
import { AgreementPdf } from "@/lib/pdf/AgreementPdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { uploadPdfBufferToCloudinary } from "@/lib/cloudinary/uploadPdf";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function must(v: any, msg: string) {
  if (v == null || String(v).trim() === "") throw new Error(msg);
  return v;
}

function asStr(v: any) {
  return String(v ?? "").trim();
}

function toMoneyString(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function fmtHuman(dtIso: string) {
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return dtIso;
  // Format for PDF: "29 Dec 2025, 10:30 PM"
  return d.toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCarLabel(make?: any, model?: any) {
  const m1 = asStr(make);
  const m2 = asStr(model);
  return [m1, m2].filter(Boolean).join(" ").trim();
}

async function logAgreement(opts: {
  supabase: any;
  agreement_id: string;
  actor_email: string;
  actor_id?: string | null;
  action: string;
  before?: any;
  after?: any;
}) {
  const { error } = await supabaseAdmin.from("agreement_logs").insert({
    agreement_id: opts.agreement_id,
    actor_id: opts.actor_id ?? null,
    actor_email: opts.actor_email,
    action: opts.action,
    before: opts.before ?? null,
    after: opts.after ?? null,
  });

  if (error) console.error("Log insert failed:", error);
}

type FilterOption = { value: string; label: string };

// ==============================================================================
// GET HANDLER (List, Single, Filters)
// ==============================================================================
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);

  // --- 1. SINGLE AGREEMENT FETCH ---
  const id = asStr(url.searchParams.get("id"));
  if (id) {
    const { data: row, error } = await supabase
      .from("agreements")
      .select(
        `
        id,
        customer_name,
        id_number,
        mobile,
        date_start,
        date_end,
        booking_duration_days,
        total_price,
        deposit_price,
        status,
        agreement_url,
        whatsapp_url,
        created_at,
        updated_at,
        creator_email,
        car_id,
        cars:car_id (
          id,
          plate_number,
          catalog_id,
          car_catalog:catalog_id ( make, model )
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(error.message, 500);
    if (!row) return jsonError("Agreement not found", 404);

    const car = (row as any).cars ?? null;
    const cat = car?.car_catalog ?? null;

    return NextResponse.json({
      ok: true,
      row: {
        ...row,
        plate_number: asStr(car?.plate_number) || "—",
        car_label: buildCarLabel(cat?.make, cat?.model) || "Unknown",
        catalog_id: asStr(car?.catalog_id) || asStr(cat?.id) || "",
      },
    });
  }

  // --- 2. LIST FETCH ---
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(5, Number(url.searchParams.get("limit") ?? 20))
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const q = asStr(url.searchParams.get("q")).toLowerCase();
  const status = asStr(url.searchParams.get("status"));
  const plate = asStr(url.searchParams.get("plate"));
  const model = asStr(url.searchParams.get("model"));
  const actor = asStr(url.searchParams.get("actor"));

  // ✅ DATE FILTERS
  const dateParam = asStr(url.searchParams.get("date")); // Start Date
  const endDateParam = asStr(url.searchParams.get("endDate")); // End Date (>=)

  const filtersOnly = url.searchParams.get("filtersOnly") === "1";

  // Preload cars for filters
  const { data: carsRows, error: carsErr } = await supabase
    .from("cars")
    .select(
      `
      id,
      plate_number,
      car_catalog:catalog_id ( make, model )
    `
    )
    .order("plate_number", { ascending: true })
    .limit(5000);

  if (carsErr) return jsonError(carsErr.message, 500);

  const plates: FilterOption[] = Array.from(
    new Set(
      (carsRows ?? []).map((c: any) => asStr(c.plate_number)).filter(Boolean)
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((p) => ({ value: p, label: p }));

  const models: FilterOption[] = Array.from(
    new Set(
      (carsRows ?? [])
        .map((c: any) =>
          buildCarLabel(c?.car_catalog?.make, c?.car_catalog?.model)
        )
        .filter(Boolean)
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((m) => ({ value: m, label: m }));

  const filters = { plates, models };
  if (filtersOnly) return NextResponse.json({ ok: true, filters });

  // Base Query
  let query = supabase
    .from("agreements")
    .select(
      `
      id,
      customer_name,
      id_number,
      mobile,
      date_start,
      date_end,
      booking_duration_days,
      total_price,
      deposit_price,
      status,
      agreement_url,
      whatsapp_url,
      created_at,
      updated_at,
      creator_email,
      car_id,
      cars:car_id (
        id,
        plate_number,
        car_catalog:catalog_id ( make, model )
      )
    `,
      { count: "exact" }
    )
    .order("date_start", { ascending: false })
    .order("date_end", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  // Apply Status Filter
  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "Deleted");
  }

  // ✅ Apply Start Date Filter
  if (dateParam) {
    query = query
      .gte("date_start", `${dateParam}T00:00:00`)
      .lte("date_start", `${dateParam}T23:59:59`);
  }

  // ✅ Apply End Date Filter (Ending on or after)
  if (endDateParam) {
    query = query.gte("date_end", `${endDateParam}T00:00:00`);
  }

  // Apply Plate Filter
  if (plate) {
    const ids =
      (carsRows ?? [])
        .filter((c: any) =>
          asStr(c.plate_number).toLowerCase().includes(plate.toLowerCase())
        )
        .map((c: any) => c.id)
        .filter(Boolean) ?? [];

    if (!ids.length) {
      return NextResponse.json({
        ok: true,
        page,
        limit,
        total: 0,
        rows: [],
        filters,
      });
    }
    query = query.in("car_id", ids);
  }

  // Apply Model Filter
  if (model) {
    const ids =
      (carsRows ?? [])
        .filter(
          (c: any) =>
            buildCarLabel(c?.car_catalog?.make, c?.car_catalog?.model) === model
        )
        .map((c: any) => c.id)
        .filter(Boolean) ?? [];

    if (!ids.length) {
      return NextResponse.json({
        ok: true,
        page,
        limit,
        total: 0,
        rows: [],
        filters,
      });
    }
    query = query.in("car_id", ids);
  }

  // Apply Search (Q) Filter
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      [
        `customer_name.ilike.${like}`,
        `id_number.ilike.${like}`,
        `mobile.ilike.${like}`,
        `status.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;
  if (error) return jsonError(error.message, 500);

  // Flatten rows for frontend
  let rows =
    (data ?? []).map((a: any) => {
      const car = a.cars ?? null;
      const cat = car?.car_catalog ?? null;
      const plate_number = asStr(car?.plate_number) || "—";
      const car_label = buildCarLabel(cat?.make, cat?.model) || "Unknown";
      return { ...a, plate_number, car_label };
    }) ?? [];

  // Actor Filter (via Logs)
  if (actor) {
    const { data: logRows, error: logErr } = await supabase
      .from("agreement_logs")
      .select("agreement_id, actor_email")
      .ilike("actor_email", `%${actor}%`)
      .limit(5000);

    if (!logErr) {
      const ids = new Set((logRows ?? []).map((l: any) => l.agreement_id));
      rows = rows.filter((r: any) => ids.has(r.id));
    }
  }

  return NextResponse.json({
    ok: true,
    page,
    limit,
    total: count ?? rows.length,
    rows,
    filters,
  });
}

// ==============================================================================
// POST HANDLER (Create, Update, Delete, Preview)
// ==============================================================================
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();

  let actorEmail = (gate as any)?.email || (gate as any)?.actor?.email || "";
  let actorId = (gate as any)?.id || (gate as any)?.actor?.id || null;
  const actorRole =
    (gate as any)?.role || (gate as any)?.actor?.role || "admin";

  if (!actorEmail) {
    const { data } = await supabase.auth
      .getUser()
      .catch(() => ({ data: null as any }));
    actorEmail = data?.user?.email ?? "admin@unknown";
    actorId = actorId ?? data?.user?.id ?? null;
  }

  const body = await req.json().catch(() => ({}));
  const action = asStr(body?.action);

  try {
    if (!action) throw new Error("Missing action");

    // --- DELETE ---
    if (action === "delete") {
      if (actorRole !== "superadmin") return jsonError("Forbidden", 403);
      const id = asStr(body?.id);
      if (!id) throw new Error("Missing agreement id");

      const { data: before, error: exErr } = await supabaseAdmin
        .from("agreements")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (exErr) throw new Error(exErr.message);
      if (!before) throw new Error("Agreement not found");

      const { error: delErr } = await supabaseAdmin
        .from("agreements")
        .update({ status: "Deleted" })
        .eq("id", id);

      if (delErr) throw new Error(delErr.message);

      await logAgreement({
        supabase,
        agreement_id: id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: "soft_deleted",
        before,
        after: { status: "Deleted" },
      });

      return NextResponse.json({ ok: true });
    }

    const payload = body?.payload ?? {};

    // --- PREVIEW PDF ---
    if (action === "preview") {
      const customer_name = must(
        payload.customer_name,
        "Customer name required"
      );
      const id_number = must(payload.id_number, "IC/Passport required");
      const mobileE164 = normalizePhoneInternational(
        must(payload.mobile, "Mobile required")
      );
      const agent_email = asStr(payload.agent_email);
      const plate_number = must(payload.plate_number, "Plate required");
      const car_type = must(payload.car_type, "Car model required");
      const date_start_iso = must(
        payload.date_start_iso,
        "Start date/time required"
      );
      const date_end_iso = must(payload.date_end_iso, "End date/time required");
      const total_price = toMoneyString(
        must(payload.total_price, "Total price required")
      );
      const deposit_price = toMoneyString(payload.deposit_price ?? 0);

      const element = createElement(AgreementPdf as any, {
        data: {
          logo_url: "https://jrv-admin.vercel.app/logo.png",
          customer_name,
          id_number,
          mobile: mobileE164,
          plate_number,
          car_type,
          date_start: fmtHuman(date_start_iso),
          date_end: fmtHuman(date_end_iso),
          total_price,
          deposit_price,
          agent_email: agent_email,
        },
      });

      const pdfBuffer = await renderToBuffer(element as any);
      const publicId = `PREVIEW_${mobileE164.replace(
        "+",
        ""
      )}_${id_number}_${plate_number}`.replace(/\s+/g, "_");
      const up = await uploadPdfBufferToCloudinary({
        buffer: Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer as any),
        publicId,
      });

      return NextResponse.json({ ok: true, preview_url: up.secure_url });
    }

    // --- CONFIRM CREATE ---
    if (action === "confirm_create") {
      const customer_name = must(
        payload.customer_name,
        "Customer name required"
      );
      const id_number = must(payload.id_number, "IC/Passport required");
      const mobileE164 = normalizePhoneInternational(
        must(payload.mobile, "Mobile required")
      );
      const car_id = must(payload.car_id, "Car selection required");
      const catalog_id = payload.catalog_id ?? null;
      const plate_number = must(payload.plate_number, "Plate required");
      const car_type = must(payload.car_type, "Car model required");
      const date_start_iso = must(
        payload.date_start_iso,
        "Start date/time required"
      );
      const date_end_iso = must(payload.date_end_iso, "End date/time required");
      const booking_duration_days =
        Number(payload.booking_duration_days ?? 0) || null;
      const total_price = toMoneyString(
        must(payload.total_price, "Total price required")
      );
      const deposit_price = toMoneyString(payload.deposit_price ?? 0);
      const agent_email = asStr(payload.agent_email) || actorEmail;

      // 1. Generate PDF
      const element = createElement(AgreementPdf as any, {
        data: {
          logo_url: "https://jrv-admin.vercel.app/logo.png",
          customer_name,
          id_number,
          mobile: mobileE164,
          plate_number,
          car_type,
          date_start: fmtHuman(date_start_iso),
          date_end: fmtHuman(date_end_iso),
          total_price,
          deposit_price,
          agent_email,
        },
      });

      const pdfBuffer = await renderToBuffer(element as any);
      const publicId = `${mobileE164.replace(
        "+",
        ""
      )}_${id_number}_${plate_number}`.replace(/\s+/g, "_");
      const up = await uploadPdfBufferToCloudinary({
        buffer: Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer as any),
        publicId,
      });

      const message = `Your rental agreement with JRV Car Rental is available here: ${up.secure_url}`;
      const whatsapp_url = buildWhatsAppUrl(mobileE164, message);

      // 2. Insert to DB (WITH FULL TIME ISO)
      const { data: inserted, error: insErr } = await supabase
        .from("agreements")
        .insert({
          car_id,
          catalog_id,
          customer_name,
          id_number,
          mobile: mobileE164.replace("+", ""),

          // ✅ FIX: Saving full UTC ISO string
          date_start: date_start_iso,
          date_end: date_end_iso,

          booking_duration_days,
          total_price,
          deposit_price,
          status: payload.status ?? "New",
          creator_email: actorEmail,
          agreement_url: up.secure_url,
          whatsapp_url,
          plate_number: plate_number,
          car_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (insErr) throw new Error(insErr.message);
      if (!inserted?.id) throw new Error("Agreement create failed");

      await logAgreement({
        supabase,
        agreement_id: inserted.id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: "created",
        before: null,
        after: {
          car_id,
          catalog_id,
          plate_number,
          car_type,
          agreement_url: up.secure_url,
          whatsapp_url,
        },
      });

      return NextResponse.json({
        ok: true,
        id: inserted.id,
        agreement_url: up.secure_url,
        whatsapp_url,
      });
    }

    // --- CONFIRM UPDATE ---
    if (action === "confirm_update") {
      const agreement_id = must(payload.id, "Missing agreement id");
      const { data: existing, error: exErr } = await supabase
        .from("agreements")
        .select("*")
        .eq("id", agreement_id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (!existing) throw new Error("Agreement not found");

      const customer_name = must(
        payload.customer_name,
        "Customer name required"
      );
      const id_number = must(payload.id_number, "IC/Passport required");
      const mobileE164 = normalizePhoneInternational(
        must(payload.mobile, "Mobile required")
      );
      const car_id = must(payload.car_id, "Car selection required");
      const catalog_id = payload.catalog_id ?? existing.catalog_id ?? null;
      const plate_number = must(payload.plate_number, "Plate required");
      const car_type = must(payload.car_type, "Car model required");
      const date_start_iso = must(
        payload.date_start_iso,
        "Start date/time required"
      );
      const date_end_iso = must(payload.date_end_iso, "End date/time required");
      const booking_duration_days =
        Number(
          payload.booking_duration_days ?? existing.booking_duration_days ?? 0
        ) || null;
      const total_price = toMoneyString(
        must(payload.total_price, "Total price required")
      );
      const deposit_price = toMoneyString(
        payload.deposit_price ?? existing.deposit_price ?? 0
      );
      let nextStatus =
        asStr(payload.status) || asStr(existing.status) || "Editted";
      if (actorRole !== "superadmin") {
        if (nextStatus !== "Cancelled") nextStatus = "Editted";
      }
      const agent_email = asStr(payload.agent_email) || actorEmail;

      // 1. Regenerate PDF
      const element = createElement(AgreementPdf as any, {
        data: {
          logo_url: "https://jrv-admin.vercel.app/logo.png",
          customer_name,
          id_number,
          mobile: mobileE164,
          plate_number,
          car_type,
          date_start: fmtHuman(date_start_iso),
          date_end: fmtHuman(date_end_iso),
          total_price,
          deposit_price,
          status: nextStatus,
          agent_email,
        },
      });

      const pdfBuffer = await renderToBuffer(element as any);
      const publicId = `${mobileE164.replace(
        "+",
        ""
      )}_${id_number}_${plate_number}`.replace(/\s+/g, "_");
      const up = await uploadPdfBufferToCloudinary({
        buffer: Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer as any),
        publicId,
      });
      const message = `Your updated rental agreement with JRV Car Rental is available here: ${up.secure_url}`;
      const whatsapp_url = buildWhatsAppUrl(mobileE164, message);

      const updatePayload: any = {
        car_id,
        catalog_id,
        customer_name,
        id_number,
        mobile: mobileE164.replace("+", ""),

        // ✅ FIX: Saving full UTC ISO string
        date_start: date_start_iso,
        date_end: date_end_iso,

        booking_duration_days,
        total_price,
        deposit_price,
        status: payload.status ?? existing.status ?? "Editted",
        agreement_url: up.secure_url,
        whatsapp_url,
        plate_number: plate_number,
        car_type,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from("agreements")
        .update(updatePayload)
        .eq("id", agreement_id);
      if (upErr) throw new Error(upErr.message);

      await logAgreement({
        supabase,
        agreement_id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: "updated_regenerated",
        before: existing,
        after: updatePayload,
      });

      return NextResponse.json({
        ok: true,
        agreement_url: up.secure_url,
        whatsapp_url,
      });
    }

    return jsonError("Unknown action", 400);
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 400);
  }
}
