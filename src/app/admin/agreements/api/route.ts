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
  return NextResponse.json({ ok: false, error: message, status }, { status });
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

  return d.toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildCarLabel(make?: any, model?: any) {
  const m1 = asStr(make);
  const m2 = asStr(model);
  return [m1, m2].filter(Boolean).join(" ").trim();
}

function klDayStartUtcIso(dateYYYYMMDD: string) {
  const [y, m, d] = dateYYYYMMDD.split("-").map((x) => Number(x));
  if (!y || !m || !d) return "";
  const ms = Date.UTC(y, m - 1, d, -8, 0, 0, 0);
  const dt = new Date(ms);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
}

function klDayEndUtcIso(dateYYYYMMDD: string) {
  const start = klDayStartUtcIso(dateYYYYMMDD);
  if (!start) return "";
  const ms = new Date(start).getTime() + 24 * 60 * 60 * 1000 - 1;
  const dt = new Date(ms);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
}

async function syncCarStatus(carId: string) {
  const nowIso = new Date().toISOString();
  // Check for any active agreement for this car
  const { data } = await supabaseAdmin
    .from("agreements")
    .select("id")
    .eq("car_id", carId)
    .not("status", "in", `("Deleted","Cancelled","Completed")`)
    .gt("date_end", nowIso)
    .limit(1);

  const nextStatus = (data ?? []).length ? "rented" : "available";
  await supabaseAdmin
    .from("cars")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", carId);
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

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);

  const id = asStr(url.searchParams.get("id"));
  if (id) {
    const { data: row, error } = await supabase
      .from("agreements")
      .select(
        `
        id, customer_name, id_number, mobile, date_start, date_end, booking_duration_days,
        total_price, deposit_price, deposit_refunded, eligible_for_event, status, agreement_url, whatsapp_url, created_at, updated_at, creator_email, editor_email, car_id, ic_url,
        cars:car_id ( id, plate_number, catalog_id, car_catalog:catalog_id ( make, model ) )
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
  const dateParam = asStr(url.searchParams.get("date"));
  const endDateParam = asStr(url.searchParams.get("endDate"));
  const depositFilter = asStr(url.searchParams.get("deposit"));
  const actor = asStr(url.searchParams.get("actor"));
  const filtersOnly = url.searchParams.get("filtersOnly") === "1";

  const { data: carsRows, error: carsErr } = await supabase
    .from("cars")
    .select(`id, plate_number, car_catalog:catalog_id ( make, model )`)
    .order("plate_number", { ascending: true })
    .limit(5000);

  if (carsErr) return jsonError(carsErr.message, 500);

  const plates: FilterOption[] = Array.from(
    new Set(
      (carsRows ?? []).map((c: any) => asStr(c.plate_number)).filter(Boolean)
    )
  )
    .sort()
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
    .sort()
    .map((m) => ({ value: m, label: m }));
  if (filtersOnly)
    return NextResponse.json({ ok: true, filters: { plates, models } });

  let query = supabase
    .from("agreements")
    .select(
      `
      id, customer_name, id_number, mobile, date_start, date_end, booking_duration_days,
      total_price, deposit_price, deposit_refunded, eligible_for_event, status, agreement_url, whatsapp_url, created_at, updated_at, creator_email, editor_email, car_id,
      cars:car_id ( id, plate_number, car_catalog:catalog_id ( make, model ) )
    `,
      { count: "exact" }
    )
    .order("date_start", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "Deleted").neq("status", "Cancelled");
  }

  // Deposit filter (based on deposit_price and deposit_refunded)
  if (depositFilter === "only") {
    query = query.gt("deposit_price", 0);
  } else if (depositFilter === "not_paid") {
    query = query.gt("deposit_price", 0).eq("deposit_refunded", false);
  } else if (depositFilter === "paid") {
    query = query.gt("deposit_price", 0).eq("deposit_refunded", true);
  }

  if (dateParam) {
    const s = klDayStartUtcIso(dateParam);
    const e = klDayEndUtcIso(dateParam);
    if (s && e) query = query.gte("date_start", s).lte("date_start", e);
  }
  if (endDateParam) {
    const s = klDayStartUtcIso(endDateParam);
    if (s) query = query.gte("date_end", s);
  }

  if (plate) {
    const ids = (carsRows ?? [])
      .filter((c: any) =>
        asStr(c.plate_number).toLowerCase().includes(plate.toLowerCase())
      )
      .map((c: any) => c.id);
    if (ids.length) query = query.in("car_id", ids);
    else
      return NextResponse.json({
        ok: true,
        page,
        limit,
        total: 0,
        rows: [],
        filters: { plates, models },
      });
  }

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `customer_name.ilike.${like},id_number.ilike.${like},mobile.ilike.${like},status.ilike.${like}`
    );
  }

  const { data, error, count } = await query;
  if (error) return jsonError(error.message, 500);

  let rows = (data ?? []).map((a: any) => {
    const car = a.cars ?? null;
    const cat = car?.car_catalog ?? null;
    return {
      ...a,
      plate_number: asStr(car?.plate_number) || "—",
      car_label: buildCarLabel(cat?.make, cat?.model) || "Unknown",
    };
  });

  if (actor) {
    const { data: logRows } = await supabase
      .from("agreement_logs")
      .select("agreement_id")
      .ilike("actor_email", `%${actor}%`);
    const ids = new Set((logRows || []).map((l: any) => l.agreement_id));
    rows = rows.filter((r: any) => ids.has(r.id));
  }

  return NextResponse.json({
    ok: true,
    page,
    limit,
    total: count ?? rows.length,
    rows,
    filters: { plates, models },
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return jsonError(gate.message, gate.status);

  const supabase = await createSupabaseServer();
  let actorEmail = (gate as any)?.email || (gate as any)?.user?.email || "";
  let actorId = (gate as any)?.id || (gate as any)?.user?.id || null;
  const actorRole = (gate as any)?.role || "admin";

  if (!actorEmail) {
    const { data } = await supabase.auth.getUser();
    actorEmail = data?.user?.email || "admin@unknown";
    actorId = data?.user?.id || null;
  }

  const body = await req.json().catch(() => ({}));
  const action = asStr(body?.action);
  const payload = body?.payload ?? {};

  try {
    if (!action) throw new Error("Missing action");

    if (action === "toggle_deposit_refunded") {
      const id = asStr(body?.id);
      const value = Boolean(body?.value);
      if (!id) throw new Error("Missing agreement id");

      const { data: beforeRow } = await supabaseAdmin
        .from("agreements")
        .select("id, deposit_refunded, deposit_price")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabaseAdmin
        .from("agreements")
        .update({
          deposit_refunded: value,
          editor_email: actorEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await logAgreement({
        supabase,
        agreement_id: id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: "deposit_refunded_toggled",
        before: beforeRow ?? { id },
        after: { deposit_refunded: value },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (actorRole !== "superadmin")
        return jsonError("Forbidden: Superadmin only", 403);
      const id = asStr(body?.id);
      if (!id) throw new Error("Missing agreement id");

      const { data: targetRow } = await supabaseAdmin
        .from("agreements")
        .select("id, car_id, status")
        .eq("id", id)
        .maybeSingle();

      let finalStatus = "Deleted";
      const { error: err1 } = await supabaseAdmin
        .from("agreements")
        .update({ status: "Deleted" })
        .eq("id", id);

      if (err1) {
        finalStatus = "Cancelled";
        const { error: err2 } = await supabaseAdmin
          .from("agreements")
          .update({ status: "Cancelled" })
          .eq("id", id);
        if (err2)
          throw new Error(
            "Could not delete or cancel. DB Error: " + err2.message
          );
      }

      await logAgreement({
        supabase,
        agreement_id: id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: "soft_deleted",
        before: { id },
        after: { status: finalStatus },
      });

      const carId = asStr(targetRow?.car_id);
      if (carId) await syncCarStatus(carId);

      return NextResponse.json({ ok: true });
    }

    if (action === "preview") {
      const data = {
        logo_url: "https://jrv-admin.vercel.app/logo.png",
        customer_name: must(payload.customer_name, "Name required"),
        id_number: must(payload.id_number, "IC required"),
        mobile: normalizePhoneInternational(
          must(payload.mobile, "Mobile required")
        ),
        plate_number: must(payload.plate_number, "Plate required"),
        car_type: must(payload.car_type, "Model required"),
        date_start: fmtHuman(
          must(payload.date_start_iso, "Start date required")
        ),
        date_end: fmtHuman(must(payload.date_end_iso, "End date required")),
        total_price: toMoneyString(must(payload.total_price, "Price required")),
        deposit_price: toMoneyString(payload.deposit_price),
        deposit_refunded: Boolean(payload.deposit_refunded),
        agent_email: asStr(payload.agent_email),
        ic_url: payload.ic_url || null,
      };

      const pdfBuffer = await renderToBuffer(
        createElement(AgreementPdf as any, { data }) as any
      );
      const publicId = `PREVIEW_${data.mobile.replace("+", "")}_${Date.now()}`;
      const up = await uploadPdfBufferToCloudinary({
        buffer: Buffer.from(pdfBuffer),
        publicId,
      });

      return NextResponse.json({ ok: true, preview_url: up.secure_url });
    }

    if (action === "confirm_create" || action === "confirm_update") {
      const isEdit = action === "confirm_update";
      const id = isEdit ? must(payload.id, "Missing ID") : undefined;

      let prevCarId: string | null = null;
      let existingAgreementUrl = null;
      let existingWhatsappUrl = null;
      let prevRow: any = null;

      if (isEdit && id) {
        // ✅ FETCH ALL (*) to ensure log is full
        const { data: prev } = await supabaseAdmin
          .from("agreements")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        prevRow = prev;
        prevCarId = prev?.car_id ? asStr(prev.car_id) : null;
        existingAgreementUrl = prev?.agreement_url;
        existingWhatsappUrl = prev?.whatsapp_url;
      }

      // ✅ LOGIC: If updated, force status to "Editted" or "Extended"
      let newStatus = payload.status || "New";
      const nowMs = Date.now();
      const newEndMs = payload.date_end_iso
        ? new Date(payload.date_end_iso).getTime()
        : 0;

      if (isEdit) {
        // If it's an edit and not explicitly set to terminal status
        if (
          !["Cancelled", "Completed", "Deleted", "Extended"].includes(newStatus)
        ) {
          // If the new end date is in the future, mark as Extended
          if (newEndMs > nowMs) {
            newStatus = "Extended";
          } else {
            newStatus = "Editted";
          }
        } else if (newStatus === "Extended" && newEndMs <= nowMs) {
          // If it was marked as Extended but the date is in the past, fall back to Editted
          newStatus = "Editted";
        }
      } else {
        // For new agreements, if expiry is in the future, it's just "New"
        // (If it was somehow created in the past, maybe call it Completed?)
        if (newEndMs < nowMs && newStatus === "New") {
          newStatus = "Completed";
        }
      }

      const dbData: any = {
        customer_name: must(payload.customer_name, "Name required"),
        id_number: must(payload.id_number, "IC required"),
        mobile: normalizePhoneInternational(
          must(payload.mobile, "Mobile required")
        ).replace("+", ""),
        car_id: must(payload.car_id, "Car required"),
        catalog_id: payload.catalog_id || null,
        plate_number: must(payload.plate_number, "Plate required"),
        car_type: must(payload.car_type, "Model required"),
        date_start: must(payload.date_start_iso, "Start date required"),
        date_end: must(payload.date_end_iso, "End date required"),
        booking_duration_days: Number(payload.booking_duration_days) || 0,
        total_price: toMoneyString(payload.total_price),
        deposit_price: toMoneyString(payload.deposit_price),
        deposit_refunded: Boolean(payload.deposit_refunded),
        status: newStatus,
        creator_email: isEdit ? undefined : actorEmail,
        editor_email: isEdit ? actorEmail : null,
        updated_at: new Date().toISOString(),
        ic_url: payload.ic_url || null,
        eligible_for_event: payload.eligible_for_event ?? true,
      };

      if (!isEdit) {
        dbData.created_at = new Date().toISOString();
        dbData.deposit_refunded = false;
        dbData.editor_email = null;
      }

      // Skip PDF Logic
      if (payload.skip_pdf && isEdit) {
        dbData.agreement_url = existingAgreementUrl;
        dbData.whatsapp_url = existingWhatsappUrl;
      } else {
        const pdfData = {
          logo_url: "https://jrv-admin.vercel.app/logo.png",
          ...dbData,
          mobile: normalizePhoneInternational(payload.mobile),
          date_start: fmtHuman(dbData.date_start),
          date_end: fmtHuman(dbData.date_end),
          agent_email: asStr(payload.agent_email) || actorEmail,
          ic_url: dbData.ic_url,
        };

        const pdfBuffer = await renderToBuffer(
          createElement(AgreementPdf as any, { data: pdfData }) as any
        );
        const publicId = `${pdfData.mobile.replace("+", "")}_${
          dbData.id_number
        }_${dbData.plate_number}_${Date.now()}`;
        const up = await uploadPdfBufferToCloudinary({
          buffer: Buffer.from(pdfBuffer),
          publicId,
        });

        dbData.agreement_url = up.secure_url;
        dbData.whatsapp_url = buildWhatsAppUrl(
          pdfData.mobile,
          `Your rental agreement: ${up.secure_url}`
        );
      }

      let res;
      if (isEdit) {
        res = await supabase
          .from("agreements")
          .update(dbData)
          .eq("id", id)
          .select("id")
          .single();
      } else {
        res = await supabase
          .from("agreements")
          .insert(dbData)
          .select("id")
          .single();
      }

      if (res.error) throw new Error(res.error.message);

      await logAgreement({
        supabase,
        agreement_id: res.data.id,
        actor_email: actorEmail,
        actor_id: actorId,
        action: isEdit ? "updated" : "created",
        before: isEdit ? prevRow : null, // ✅ Correctly passes the full before object
        after: dbData,
      });

      const nextCarId = asStr(dbData.car_id);
      if (prevCarId && prevCarId !== nextCarId) await syncCarStatus(prevCarId);
      if (nextCarId) await syncCarStatus(nextCarId);

      return NextResponse.json({
        ok: true,
        id: res.data.id,
        agreement_url: dbData.agreement_url,
        whatsapp_url: dbData.whatsapp_url,
      });
    }

    return jsonError("Unknown action", 400);
  } catch (e: any) {
    console.error("API Error:", e);
    return jsonError(e.message || "Server Error", 500);
  }
}
