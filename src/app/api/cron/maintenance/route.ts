import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendSlackNotification } from "@/lib/slack";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isTest = searchParams.get("test") === "true";

    // 1. Fetch active cars
    const { data: cars, error } = await supabaseAdmin
      .from("cars")
      .select(
        `
        id, plate_number, status, current_mileage, track_insurance,
        next_service_mileage, next_gear_oil_mileage, next_tyre_mileage, next_brake_pad_mileage,
        car_catalog ( make, model )
      `
      )
      .neq("status", "inactive")
      .order("plate_number");

    if (error) throw error;
    if (!cars || cars.length === 0)
      return NextResponse.json({ ok: true, count: 0 });

    const logEntries: any[] = [];
    const slackItems: any[] = [];

    cars.forEach((car: any) => {
      // Skip if tracking is disabled explicitly
      if (car.track_insurance === false) return;

      const current = car.current_mileage || 0;
      const intervals = [
        { label: "Service", target: car.next_service_mileage },
        { label: "Gear Oil", target: car.next_gear_oil_mileage },
        { label: "Tyres", target: car.next_tyre_mileage },
        { label: "Brake Pads", target: car.next_brake_pad_mileage },
      ];

      const issues: string[] = [];
      let isOverdue = false;

      intervals.forEach((i) => {
        if (!i.target) return;
        const diff = i.target - current;
        if (diff <= 0) {
          isOverdue = true;
          issues.push(`${i.label} OVERDUE (${Math.abs(diff)}km)`);
        } else if (diff <= 2000) {
          issues.push(`${i.label} due in ${diff}km`);
        }
      });

      if (issues.length > 0) {
        slackItems.push({
          id: car.id,
          plate_number: car.plate_number,
          make: car.car_catalog?.make,
          model: car.car_catalog?.model,
          issues,
        });

        logEntries.push({
          sent_at: new Date().toISOString(),
          reminder_type: isOverdue ? "MAINTENANCE_OVERDUE" : "MAINTENANCE_DUE",
          plate_number: car.plate_number,
          car_model: `${car.car_catalog?.make || ""} ${
            car.car_catalog?.model || ""
          }`.trim(),
        });
      }
    });

    if (slackItems.length === 0) {
      return NextResponse.json({ ok: true, message: "No maintenance needed." });
    }

    const { buildUnifiedAlert } = require("@/lib/slack");
    const slackMsg = buildUnifiedAlert("MAINTENANCE", slackItems, isTest);

    // 3. Send to Slack
    const success = await sendSlackNotification(
      slackMsg,
      process.env.SLACK_MAINTENANCE_WEBHOOK_URL
    );

    if (success && logEntries.length > 0 && !isTest) {
      const { error: logErr } = await supabaseAdmin
        .from("notification_logs")
        .insert(logEntries);
      if (logErr) console.error("Failed to insert maintenance logs", logErr);
    }

    return NextResponse.json({
      ok: true,
      count: slackItems.length,
      logged: isTest ? 0 : logEntries.length,
      test: isTest,
    });
  } catch (error: any) {
    console.error("Maintenance Cron Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
