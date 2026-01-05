// src/lib/slack.ts

const APP_TZ = "Asia/Kuala_Lumpur";

export async function sendSlackMessage(webhookUrl: string, text: string) {
  // ✅ Do NOT gate here — caller decides when to send.
  if (!webhookUrl) {
    console.error("Slack webhook missing");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error("Slack error:", await res.text());
    }
  } catch (err) {
    console.error("Slack send failed:", err);
  }
}

export async function sendSlackNotification(message: any, webhookUrl?: string) {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  console.log("SLACK: Sending notification...");
  console.log("SLACK: Target URL:", url ? "Defined" : "MISSING");
  
  if (!url) {
    console.error("Missing SLACK_WEBHOOK_URL");
    return false;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Slack send failed", txt);
      return false;
    }
    console.log("SLACK: Sent successfully");
    return true;
  } catch (e) {
    console.error("Slack error", e);
    return false;
  }
}

function fmtMYDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function buildReminderText(
  carModel: string,
  plate: string,
  endTime: Date,
  phone: string,
  isExpired: boolean
) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const whatsappLink = cleanPhone
    ? `<https://wa.me/${cleanPhone}|${phone}>`
    : phone;

  const whenStr = fmtMYDateTime(endTime);

  const modelHighlighted = `\`${carModel}\``;
  const plateHighlighted = `\`${plate}\``;
  const numberHighlighted = `\`${whatsappLink}\``;

  if (isExpired) {
    return (
      `🚨 *OVERDUE ALERT* 🚨\n` +
      `Please check if car ${modelHighlighted} (${plateHighlighted}) is returned.\n` +
      `Scheduled Return: *${whenStr} MYT*\n` +
      `Customer: ${numberHighlighted}`
    );
  }

  return (
    `🚗 *Return Reminder*\n` +
    `${modelHighlighted} (${plateHighlighted}) is scheduled to return at *${whenStr} MYT*.\n` +
    `Customer: ${numberHighlighted}`
  );
}

export function buildRenewalMessage(expiringCars: any[]) {
    // Group by type (Insurance vs Roadtax) or just list them
    if (expiringCars.length === 0) return null;

    const blocks: any[] = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🚨 Upcoming Car Renewals",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Found *${expiringCars.length}* cars with insurance or roadtax expiring soon.`
            }
        },
        { type: "divider" }
    ];

    expiringCars.forEach((car: any) => {
        let msg = `*${car.plate_number}* (${car.make} ${car.model})`;
        if (car.insurance_days != null) {
            const emoji = car.insurance_days <= 7 ? "🔴" : car.insurance_days <= 30 ? "🟠" : car.insurance_days <= 60 ? "🟡" : "🔵";
            msg += `\n> ${emoji} Insurance: ${car.insurance_expiry} (${car.insurance_days} days)`;
        }
        if (car.roadtax_days != null) {
            const emoji = car.roadtax_days <= 7 ? "🔴" : car.roadtax_days <= 30 ? "🟠" : car.roadtax_days <= 60 ? "🟡" : "🔵";
            msg += `\n> ${emoji} Roadtax: ${car.roadtax_expiry} (${car.roadtax_days} days)`;
        }

        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: msg
            }
        });
    });

    blocks.push({ type: "divider" });
    blocks.push({
        type: "context",
        elements: [
            {
                type: "mrkdwn",
                text: "View Dashboard: <https://admin.jrvservices.co/admin/insurance|Insurance Dashboard>"
            }
        ]
    });

    return { blocks };
}
