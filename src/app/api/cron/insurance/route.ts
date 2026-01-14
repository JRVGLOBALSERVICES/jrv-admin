import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { sendSlackNotification } from "@/lib/slack";
import { differenceInDays, parseISO } from "date-fns";

export async function GET(req: Request) {
  // 1. Basic Gate
  if (process.env.ENABLE_SLACK !== "true") {
    return NextResponse.json({ ok: true, message: "Disabled" });
  }

  // TEST CHECK
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  // 2. Fetch cars
  // Note: createSupabaseServer() handles cookie-based auth, but for Cron we might need createClient w/ Service Key if it runs strictly server-side without a user session.
  // However, createSupabaseServer() attempts to use cookies which won't exist.
  // We should use the ADMIN (Service Role) client here since Cron has no user.

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cars, error } = await supabase
    .from("cars")
    .select(
      `
      id, 
      plate_number, 
      insurance_expiry, 
      roadtax_expiry,
      catalog:catalog_id ( make, model )
    `
    )
    .neq("status", "inactive");

  if (error) {
    console.error("Cron Car Fetch Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  if (!cars)
    return NextResponse.json({ ok: true, sent: false, reason: "No cars" });

  // 3. Identify expiring items (Next 90 days)
  const today = new Date();
  const expiringCars: any[] = [];

  cars.forEach((c: any) => {
    let hasIssue = false;
    const item: any = {
      plate_number: c.plate_number,
      make: c.catalog?.make,
      model: c.catalog?.model,
    };

    if (c.insurance_expiry) {
      const d = parseISO(c.insurance_expiry);
      const days = differenceInDays(d, today);
      if (days <= 90) {
        item.insurance_days = days;
        item.insurance_expiry = c.insurance_expiry;
        hasIssue = true;
      }
    }

    if (c.roadtax_expiry) {
      const d = parseISO(c.roadtax_expiry);
      const days = differenceInDays(d, today);
      if (days <= 90) {
        item.roadtax_days = days;
        item.roadtax_expiry = c.roadtax_expiry;
        hasIssue = true;
      }
    }

    if (hasIssue) expiringCars.push(item);
  });

  if (expiringCars.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: false,
      message: "No expiring cars found",
    });
  }

  // 4. Build Slack Message
  // 4. Build Slack Message
  // Dynamic require to avoid build issues if function not in initial import?
  // Actually, let's use the import if we fix it at top.
  // But to be consistent with maintenance cron, I can use require or fixed import.
  // Step 788 import showed: import { sendSlackNotification } from "@/lib/slack";
  // I will update the import at the top too.

  const { buildUnifiedAlert } = require("@/lib/slack");
  const slackMsg = buildUnifiedAlert("INSURANCE", expiringCars, isTest);
  if (!slackMsg) return NextResponse.json({ ok: true, sent: false });

  // 5. Send using INSURANCE webhook
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_INSURANCE;
  if (!webhookUrl) {
    console.error("Missing SLACK_WEBHOOK_URL_INSURANCE for cron");
    return NextResponse.json({
      ok: false,
      error: "Missing webhook configuration",
    });
  }

  const success = await sendSlackNotification(slackMsg, webhookUrl);

  if (success && !isTest) {
    const logs = expiringCars.map((c) => ({
      sent_at: new Date().toISOString(),
      reminder_type: c.insurance_days != null ? "INSURANCE" : "ROADTAX",
      plate_number: c.plate_number,
      car_model: `${c.make} ${c.model}`.trim(),
      recipient: "Slack Channel",
    }));

    const { error: logErr } = await supabase
      .from("notification_logs")
      .insert(logs);
    if (logErr) console.error("Failed to insert notification logs", logErr);
  }

  return NextResponse.json({
    ok: success,
    count: expiringCars.length,
    test: isTest,
  });
}
