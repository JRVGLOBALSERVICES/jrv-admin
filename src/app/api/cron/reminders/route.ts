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

// ✅ For 1-min cron testing: set REMINDER_WINDOW_MINUTES=1
const WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES ?? "1");

// ✅ Prevent repeated Slack sends if cron runs every minute
const DEDUPE_COOLDOWN_MINUTES = Number(
  process.env.REMINDER_DEDUPE_COOLDOWN_MINUTES ?? "15"
);

// ✅ Include New/Edited/etc, exclude terminal statuses
const EXCLUDED_STATUSES = ["Deleted", "Cancelled", "Completed"];

async function alreadySentRecently(agreementId: string, reminderType: string) {
  const since = new Date(Date.now() - DEDUPE_COOLDOWN_MINUTES * 60 * 1000);

  const { data, error } = await supabase
    .from("notification_logs")
    .select("id, sent_at")
    .eq("agreement_id", agreementId)
    .eq("reminder_type", reminderType)
    .gte("sent_at", since.toISOString())
    .order("sent_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Dedupe check failed:", error);
    return false;
  }

  return !!(data && data.length > 0);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isTest = searchParams.get("test") === "true";
  const debug = searchParams.get("debug") === "1";

  // 1) Test Slack connection
  if (isTest) {
    if (!REMINDER_WEBHOOK) {
      return NextResponse.json({ error: "No Webhook URL" }, { status: 500 });
    }

    await sendSlackMessage(
      REMINDER_WEBHOOK,
      "🔔 *Test Notification*: Connection is working!"
    );
    return NextResponse.json({ ok: true, message: "Test message sent" });
  }

  // 2) Standard Logic
  if (process.env.ENABLE_SLACK !== "true") {
    return NextResponse.json({ ok: true, message: "Disabled" });
  }

  if (!REMINDER_WEBHOOK) {
    return NextResponse.json(
      { ok: false, error: "No Webhook URL" },
      { status: 500 }
    );
  }

  const now = new Date();
  let sentCount = 0;
  let skippedDuplicate = 0;

  const debugInfo: any[] = [];

  // --- SLACK NOTIFICATIONS ---
  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);

    const startWindow = new Date(
      targetTime.getTime() - WINDOW_MINUTES * 60 * 1000
    );
    const endWindow = new Date(
      targetTime.getTime() + WINDOW_MINUTES * 60 * 1000
    );

    const { data: agreements, error } = await supabase
      .from("agreements")
      .select("id, customer_name, mobile, plate_number, car_type, date_end, status")
      // ✅ include New/Edited/whatever else, exclude terminal statuses
      .not("status", "in", `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(",")})`)
      .gt("date_end", startWindow.toISOString())
      .lte("date_end", endWindow.toISOString());

    if (error) {
      console.error("Agreement fetch failed:", error);
      if (debug) debugInfo.push({ check: check.label, error: String(error) });
      continue;
    }

    if (debug) {
      debugInfo.push({
        check: check.label,
        window_minutes: WINDOW_MINUTES,
        startWindowISO: startWindow.toISOString(),
        endWindowISO: endWindow.toISOString(),
        matched: agreements?.length ?? 0,
        sample: (agreements ?? []).slice(0, 3).map((a) => ({
          id: a.id,
          plate: a.plate_number,
          status: a.status,
          end: a.date_end,
        })),
      });
    }

    if (!agreements || agreements.length === 0) continue;

    for (const ag of agreements) {
      const reminderType = check.label;

      // ✅ DEDUPE
      const dup = await alreadySentRecently(ag.id, reminderType);
      if (dup) {
        skippedDuplicate++;
        continue;
      }

      const isExpired = check.minutes === 0;
      const endDate = new Date(ag.date_end);

      const text = buildReminderText(
        ag.car_type || "Unknown",
        ag.plate_number || "Unknown",
        endDate,
        ag.mobile || "",
        isExpired
      );

      await sendSlackMessage(REMINDER_WEBHOOK, text);

      await supabase.from("notification_logs").insert({
        agreement_id: ag.id,
        plate_number: ag.plate_number,
        car_model: ag.car_type,
        reminder_type: reminderType,
      });

      sentCount++;
    }
  }

  // --- CLEANUP ---
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase
    .from("notification_logs")
    .delete()
    .lt("sent_at", twoDaysAgo.toISOString());

  // --- AUTO-COMPLETE ---
  // Buffer so EXPIRED can fire first
  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

  const { data: expiredList, error: expireError } = await supabase
    .from("agreements")
    .update({ status: "Completed" })
    // ✅ same filter here: complete any non-terminal agreements past end time
    .not("status", "in", `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(",")})`)
    .lt("date_end", bufferTime.toISOString())
    .select("id, plate_number");

  if (expireError) console.error("Auto-complete failed:", expireError);

  return NextResponse.json({
    ok: true,
    nowISO: now.toISOString(),
    window_minutes: WINDOW_MINUTES,
    dedupe_cooldown_minutes: DEDUPE_COOLDOWN_MINUTES,
    excluded_statuses: EXCLUDED_STATUSES,
    notifications_sent: sentCount,
    skipped_duplicate: skippedDuplicate,
    auto_completed: expiredList?.length || 0,
    expired_ids: expiredList?.map((e) => e.id),
    ...(debug ? { debug: debugInfo } : {}),
  });
}
