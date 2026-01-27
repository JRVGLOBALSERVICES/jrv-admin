import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSlackNotification } from "@/lib/slack";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_URL =
    process.env.SLACK_WEBHOOK_URL_UPCOMING || process.env.SLACK_WEBHOOK_URL;

export async function GET() {
    if (process.env.ENABLE_SLACK !== "true") {
        return NextResponse.json({ ok: true, message: "Disabled" });
    }

    if (!WEBHOOK_URL) {
        return NextResponse.json(
            { ok: false, error: "Missing Slack webhook" },
            { status: 500 }
        );
    }

    const now = new Date();
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: activeAgs, error } = await supabase
        .from("agreements")
        .select("id, plate_number, car_type, mobile, date_start")
        .eq("status", "Upcoming")
        .gte("date_start", now.toISOString())
        .lte("date_start", next48h.toISOString())
        .order("date_start");

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!activeAgs || activeAgs.length === 0) {
        return NextResponse.json({
            ok: true,
            message: "No upcoming bookings in next 48h.",
        });
    }

    // Build Slack Message
    // Using Block Kit for nice formatting
    const blocks: any[] = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "📅 Upcoming Bookings (Next 48h)",
                emoji: true,
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `There are *${activeAgs.length}* bookings starting soon.`,
            },
        },
        { type: "divider" },
    ];

    activeAgs.forEach((ag: any) => {
        const time = new Date(ag.date_start).toLocaleString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "short",
        });

        const agLink = `https://jrv-admin.vercel.app/admin/agreements/${ag.id}`;
        const cleanPhone = (ag.mobile || "").replace(/\D/g, "");
        const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*${ag.plate_number}* (${ag.car_type})\n> 🕒 Start: *${time}*\n> 📄 <${agLink}|View Agreement> • ${waLink ? `<${waLink}|WhatsApp>` : "No Phone"
                    }`,
            },
        });
    });

    // Action Button
    blocks.push({
        type: "actions",
        elements: [
            {
                type: "button",
                text: {
                    type: "plain_text",
                    text: "Open Admin Dashboard",
                    emoji: true,
                },
                url: "https://jrv-admin.vercel.app/admin",
                style: "primary",
            },
        ],
    });

    const payload = {
        attachments: [
            {
                color: "#c026d3", // Fuchsia-600 to match "Upcoming" tag color
                blocks: blocks,
            },
        ],
    };

    await sendSlackNotification(payload, WEBHOOK_URL);

    return NextResponse.json({
        ok: true,
        count: activeAgs.length,
        sent: true,
    });
}
