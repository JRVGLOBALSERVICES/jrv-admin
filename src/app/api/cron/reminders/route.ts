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

async function alreadySentRecently(agreementId: string, reminderType: string) {
  const since = new Date(Date.now() - DEDUPE_COOLDOWN_MINUTES * 60 * 1000);

  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("agreement_id", agreementId)
    .eq("reminder_type", reminderType)
    .gte("sent_at", since.toISOString())
    .limit(1);

  return !!(data && data.length > 0);
}

export async function GET() {
  if (process.env.ENABLE_SLACK !== "true") {
    return NextResponse.json({ ok: true, message: "Disabled" });
  }

  if (!REMINDER_WEBHOOK) {
    return NextResponse.json(
      { ok: false, error: "Missing Slack webhook" },
      { status: 500 }
    );
  }

  const now = new Date();
  let sentCount = 0;

  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);

    const startWindow = new Date(
      targetTime.getTime() - WINDOW_MINUTES * 60 * 1000
    );
    const endWindow = new Date(
      targetTime.getTime() + WINDOW_MINUTES * 60 * 1000
    );

    const { data: agreements } = await supabase
      .from("agreements")
      .select("id, mobile, plate_number, car_type, date_end")
      .not(
        "status",
        "in",
        `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(",")})`
      )
      .gt("date_end", startWindow.toISOString())
      .lte("date_end", endWindow.toISOString());

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

      await supabase.from("notification_logs").insert({
        agreement_id: ag.id,
        plate_number: ag.plate_number,
        car_model: ag.car_type,
        reminder_type: check.label,
      });

      sentCount++;
    }
  }

  // Cleanup logs older than 48h
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase
    .from("notification_logs")
    .delete()
    .lt("sent_at", twoDaysAgo.toISOString());

  // Auto-complete expired agreements (5 min buffer)
  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
  await supabase
    .from("agreements")
    .update({ status: "Completed" })
    .not(
      "status",
      "in",
      `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(",")})`
    )
    .lt("date_end", bufferTime.toISOString());

  return NextResponse.json({
    ok: true,
    notifications_sent: sentCount,
  });
}
