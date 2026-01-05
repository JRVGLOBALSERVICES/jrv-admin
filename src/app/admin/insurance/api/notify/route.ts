
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildRenewalMessage, sendSlackNotification } from "@/lib/slack";
import { differenceInDays, parseISO } from "date-fns";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });

  const supabase = await createSupabaseServer();
  
  // 1. Fetch available cars
  const { data: cars, error } = await supabase
    .from("cars")
    .select(`
      id, 
      plate_number, 
      insurance_expiry, 
      roadtax_expiry,
      catalog:catalog_id ( make, model )
    `)
    .neq("status", "inactive");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!cars) return NextResponse.json({ ok: true, sent: false, reason: "No cars" });

  // 2. Identify expiring items (Next 90 days or expired)
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
      return NextResponse.json({ ok: true, sent: false, message: "No expiring cars found" });
  }

  // 3. Build Slack Message
  const slackMsg = buildRenewalMessage(expiringCars);
  if (!slackMsg) return NextResponse.json({ ok: true, sent: false });

  // 4. Send using INSURANCE webhook
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_INSURANCE;
  console.log("NOTIFY: Using Webhook:", webhookUrl ? "Yes (Defined)" : "No (Undefined/Empty)");
  console.log("NOTIFY: Expiring Cars Count:", expiringCars.length);

  const success = await sendSlackNotification(slackMsg, webhookUrl);

  if (!success) {
      return NextResponse.json({ 
          ok: false, 
          error: "Failed to send to Slack", 
          debug: {
              webhookDefined: !!webhookUrl,
              carsFound: expiringCars.length 
          }
      });
  }

  return NextResponse.json({ ok: success, count: expiringCars.length });
}
