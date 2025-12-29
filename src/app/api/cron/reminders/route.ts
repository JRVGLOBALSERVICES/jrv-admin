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
  // We keep the "0 minute" check for the "Just Expired" notification
  { minutes: 0, label: "EXPIRED" },
];

export async function GET(req: Request) {
  if (process.env.ENABLE_SLACK !== "true")
    return NextResponse.json({ message: "Disabled" });

  const now = new Date();
  let sentCount = 0;

  // --- 1. SLACK NOTIFICATIONS (Keep existing logic) ---
  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);
    const startWindow = new Date(targetTime.getTime() - 5 * 60 * 1000);
    const endWindow = new Date(targetTime.getTime() + 5 * 60 * 1000);

    const { data: agreements } = await supabase
      .from("agreements")
      .select(
        `id, customer_name, mobile, plate_number, car_type, date_end, status`
      )
      .eq("status", "Active") // Only notify for Active cars
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

  // --- 2. CLEANUP LOGS ---
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase
    .from("notification_logs")
    .delete()
    .lt("sent_at", twoDaysAgo.toISOString());

  // --- 3. AUTO-EXPIRE LOGIC (NEW) ---
  // Find all 'Active' agreements where date_end < NOW and mark them 'Completed'
  // Note: We give a 5-minute buffer so the Slack "EXPIRED" notification above has a chance to send first.
  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 mins ago

  const { data: expiredList, error: expireError } = await supabase
    .from("agreements")
    .update({ status: "Completed" }) // Change status to Completed
    .eq("status", "Active") // Only if currently Active
    .lt("date_end", bufferTime.toISOString()) // And time has passed
    .select("id, plate_number");

  if (expireError) {
    console.error("Auto-expire failed:", expireError);
  }

  const expiredCount = expiredList?.length || 0;

  return NextResponse.json({
    ok: true,
    notifications_sent: sentCount,
    auto_completed: expiredCount,
    expired_ids: expiredList?.map((e) => e.id),
  });
}
