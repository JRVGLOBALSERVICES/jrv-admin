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

export async function GET(req: Request) {
  // 1. Check for Test Mode
  const { searchParams } = new URL(req.url);
  const isTest = searchParams.get("test") === "true";

  if (isTest) {
    if (!REMINDER_WEBHOOK) return NextResponse.json({ error: "No Webhook URL" }, { status: 500 });
    
    await sendSlackMessage(REMINDER_WEBHOOK, "🔔 *Test Notification*: Connection is working!");
    return NextResponse.json({ ok: true, message: "Test message sent" });
  }

  // 2. Standard Logic
  if (process.env.ENABLE_SLACK !== "true")
    return NextResponse.json({ message: "Disabled" });

  const now = new Date();
  let sentCount = 0;

  // --- SLACK NOTIFICATIONS ---
  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);
    const startWindow = new Date(targetTime.getTime() - 5 * 60 * 1000);
    const endWindow = new Date(targetTime.getTime() + 5 * 60 * 1000);

    const { data: agreements } = await supabase
      .from("agreements")
      .select(`id, customer_name, mobile, plate_number, car_type, date_end, status`)
      .eq("status", "Active")
      .gt("date_end", startWindow.toISOString())
      .lte("date_end", endWindow.toISOString());

    if (agreements && agreements.length > 0) {
      for (const ag of agreements) {
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
          reminder_type: check.label,
        });

        sentCount++;
      }
    }
  }

  // --- CLEANUP & AUTO-EXPIRE ---
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase.from("notification_logs").delete().lt("sent_at", twoDaysAgo.toISOString());

  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
  const { data: expiredList } = await supabase
    .from("agreements")
    .update({ status: "Completed" })
    .eq("status", "Active")
    .lt("date_end", bufferTime.toISOString())
    .select("id, plate_number");

  return NextResponse.json({
    ok: true,
    notifications_sent: sentCount,
    auto_completed: expiredList?.length || 0,
    expired_ids: expiredList?.map((e) => e.id),
  });
}