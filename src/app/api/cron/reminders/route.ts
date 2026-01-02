import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackMessage, buildReminderText } from "@/lib/slack";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REMINDER_WEBHOOK = process.env.SLACK_WEBHOOK_URL_REMINDERS!;

const CHECKS = [
  { minutes: 120, label: "2 Hours" },
  { minutes: 60, label: "1 Hour" },
  { minutes: 30, label: "30 Minutes" },
  { minutes: 10, label: "10 Minutes" },
  { minutes: 0, label: "EXPIRED" },
];

const WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES ?? "5");
const DEDUPE_COOLDOWN_MINUTES = Number(
  process.env.REMINDER_DEDUPE_COOLDOWN_MINUTES ?? "180"
);

const EXCLUDED_STATUSES = ["Deleted", "Cancelled", "Completed"];

function excludedStatusFilter() {
  return `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(",")})`;
}

async function alreadySentRecently(agreementId: string, reminderType: string) {
  const since = new Date(Date.now() - DEDUPE_COOLDOWN_MINUTES * 60 * 1000);

  const { data, error } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("agreement_id", agreementId)
    .eq("reminder_type", reminderType)
    .gte("sent_at", since.toISOString())
    .limit(1);

  if (error) return false;
  return !!(data && data.length > 0);
}

// ✅ Recalculate car status based on agreements active now
async function syncCarsFromAgreementsNow(nowIso: string) {
  // 1) Get currently active agreements now (for cars)
  const { data: activeNow, error: activeErr } = await supabase
    .from("agreements")
    .select("car_id")
    .not("status", "in", excludedStatusFilter())
    .lte("date_start", nowIso)
    .gt("date_end", nowIso)
    .not("car_id", "is", null)
    .limit(5000);

  if (activeErr) {
    console.error("syncCarsFromAgreementsNow activeErr:", activeErr);
    return;
  }

  const rentedCarIds = Array.from(
    new Set((activeNow ?? []).map((a: any) => a.car_id).filter(Boolean))
  );

  // 2) Set rented for those cars (but never override maintenance/inactive)
  if (rentedCarIds.length > 0) {
    const { error: setRentedErr } = await supabase
      .from("cars")
      .update({ status: "rented", updated_at: nowIso })
      .in("id", rentedCarIds)
      .not("status", "in", `("maintenance","inactive")`);

    if (setRentedErr) console.error("setRentedErr:", setRentedErr);
  }

  // 3) Any car that is currently "rented" but NOT in rentedCarIds -> flip to available
  // (again do not override maintenance/inactive)
  // If rentedCarIds is empty, this will flip all rented cars back to available.
  let q = supabase
    .from("cars")
    .update({ status: "available", updated_at: nowIso })
    .eq("status", "rented");

  if (rentedCarIds.length > 0)
    q = q.not("id", "in", `(${rentedCarIds.join(",")})`);

  const { error: setAvailErr } = await q;
  if (setAvailErr) console.error("setAvailErr:", setAvailErr);
}

// ✅ UPDATED: Accept 'req' to read searchParams
export async function GET(req: Request) {
  if (process.env.ENABLE_SLACK !== "true") {
    return NextResponse.json({ ok: true, message: "Disabled" });
  }

  if (!REMINDER_WEBHOOK) {
    return NextResponse.json(
      { ok: false, error: "Missing Slack webhook" },
      { status: 500 }
    );
  }

  // ✅ TEST LOGIC RESTORED
  const url = new URL(req.url);
  if (url.searchParams.get("test") === "true") {
    await sendSlackMessage(
      REMINDER_WEBHOOK,
      "🔔 *Test Notification*: The notification system is online and connected."
    );
    return NextResponse.json({ ok: true, test: "sent" });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let sentCount = 0;

  // --- REMINDERS ---
  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);

    const startWindow = new Date(
      targetTime.getTime() - WINDOW_MINUTES * 60 * 1000
    );
    const endWindow = new Date(
      targetTime.getTime() + WINDOW_MINUTES * 60 * 1000
    );

    const { data: agreements, error: agErr } = await supabase
      .from("agreements")
      .select("id, mobile, plate_number, car_type, date_end")
      .not("status", "in", excludedStatusFilter())
      .gt("date_end", startWindow.toISOString())
      .lte("date_end", endWindow.toISOString());

    if (agErr) {
      console.error("agreements fetch error:", agErr);
      continue;
    }

    if (!agreements || agreements.length === 0) continue;

    for (const ag of agreements) {
      if (await alreadySentRecently(ag.id, check.label)) continue;

      const text = buildReminderText(
        ag.car_type || "Unknown",
        ag.plate_number || "Unknown",
        new Date(ag.date_end),
        ag.mobile || "",
        check.minutes === 0
      );

      await sendSlackMessage(REMINDER_WEBHOOK, text);

      const { error: insErr } = await supabase
        .from("notification_logs")
        .insert({
          agreement_id: ag.id,
          plate_number: ag.plate_number,
          car_model: ag.car_type,
          reminder_type: check.label,
        });

      if (insErr) console.error("notification_logs insert error:", insErr);

      sentCount++;
    }
  }

  // --- CLEANUP LOGS older than 48h ---
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase
    .from("notification_logs")
    .delete()
    .lt("sent_at", twoDaysAgo.toISOString());

  // --- AUTO COMPLETE expired agreements (5 min buffer) ---
  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

  const { data: completedRows, error: completeErr } = await supabase
    .from("agreements")
    .update({ status: "Completed" })
    .not("status", "in", excludedStatusFilter())
    .lt("date_end", bufferTime.toISOString())
    .select("id, car_id");

  if (completeErr) console.error("completeErr:", completeErr);

  // ✅ SYNC CARS STATUS (after completing)
  await syncCarsFromAgreementsNow(nowIso);

  return NextResponse.json({
    ok: true,
    notifications_sent: sentCount,
    auto_completed: completedRows?.length ?? 0,
  });
}
