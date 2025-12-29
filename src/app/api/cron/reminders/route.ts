import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildReminderText } from "@/lib/slack";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REMINDER_WEBHOOK = process.env.SLACK_WEBHOOK_URL_REMINDERS;

// Helper to send to Slack with error bubbling
async function sendToSlack(text: string) {
  if (!REMINDER_WEBHOOK) {
    throw new Error("Missing SLACK_WEBHOOK_URL_REMINDERS in .env");
  }

  const res = await fetch(REMINDER_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Slack API Error (${res.status}): ${errText}`);
  }
}

const CHECKS = [
  { minutes: 120, label: "2 Hours" },
  { minutes: 60, label: "1 Hour" },
  { minutes: 30, label: "30 Minutes" },
  { minutes: 10, label: "10 Minutes" },
  { minutes: 0, label: "EXPIRED" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isTest = searchParams.get("test") === "true";

  // --- 1. TEST MODE ---
  if (isTest) {
    try {
      console.log("Attempting to send test message...");

      if (!REMINDER_WEBHOOK) {
        return NextResponse.json(
          {
            ok: false,
            error: "Env variable SLACK_WEBHOOK_URL_REMINDERS is missing!",
          },
          { status: 500 }
        );
      }

      const fakeTime = new Date();
      fakeTime.setHours(fakeTime.getHours() + 1);

      const text = buildReminderText(
        "TEST CAR (Honda Civic)",
        "TEST-1234",
        fakeTime,
        "+60123456789",
        false
      );

      await sendToSlack(`[TEST MODE] ${text}`);

      return NextResponse.json({
        ok: true,
        message: "Test message sent successfully to Slack.",
      });
    } catch (e: any) {
      console.error("Test Send Failed:", e.message);
      return NextResponse.json(
        { ok: false, error: e.message },
        { status: 500 }
      );
    }
  }

  // --- 2. REAL LOGIC ---
  if (process.env.ENABLE_SLACK !== "true") {
    return NextResponse.json({
      message: "Slack is disabled (ENABLE_SLACK != true)",
    });
  }

  const now = new Date();
  let sentCount = 0;
  const errors = [];

  for (const check of CHECKS) {
    const targetTime = new Date(now.getTime() + check.minutes * 60 * 1000);
    const startWindow = new Date(targetTime.getTime() - 5 * 60 * 1000);
    const endWindow = new Date(targetTime.getTime() + 5 * 60 * 1000);

    const { data: agreements } = await supabase
      .from("agreements")
      .select(
        `id, customer_name, mobile, plate_number, car_type, date_end, status`
      )
      .neq("status", "Cancelled")
      .neq("status", "Deleted")
      .neq("status", "Completed")
      .gt("date_end", startWindow.toISOString())
      .lte("date_end", endWindow.toISOString());

    if (agreements && agreements.length > 0) {
      for (const ag of agreements) {
        try {
          const isExpired = check.minutes === 0;
          const text = buildReminderText(
            ag.car_type || "Unknown",
            ag.plate_number || "Unknown",
            new Date(ag.date_end),
            ag.mobile || "",
            isExpired
          );

          await sendToSlack(text);

          // Log to DB
          await supabase.from("notification_logs").insert({
            agreement_id: ag.id,
            plate_number: ag.plate_number,
            car_model: ag.car_type,
            reminder_type: check.label,
          });

          sentCount++;
        } catch (err: any) {
          console.error("Failed to send reminder:", err);
          errors.push(err.message);
        }
      }
    }
  }

  // Auto-Cleanup Old Logs
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  await supabase
    .from("notification_logs")
    .delete()
    .lt("sent_at", twoDaysAgo.toISOString());

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
