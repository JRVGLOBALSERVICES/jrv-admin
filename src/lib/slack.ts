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
  isExpired: boolean,
  agreementId: string
) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const whatsappLink = cleanPhone
    ? `<https://wa.me/${cleanPhone}|${phone}>`
    : phone;

  const whenStr = fmtMYDateTime(endTime);
  const agLink = `https://jrv-admin.vercel.app/admin/agreements/${agreementId}`;

  const modelHighlighted = `\`${carModel}\``;
  const plateHighlighted = `\`${plate}\``;
  const numberHighlighted = `\`${whatsappLink}\``;

  if (isExpired) {
    return (
      `🚨 *OVERDUE ALERT* 🚨\n` +
      `Please check if car ${modelHighlighted} (${plateHighlighted}) is returned.\n` +
      `Scheduled Return: *${whenStr} MYT*\n` +
      `Customer: ${numberHighlighted}\n` +
      `📄 <${agLink}|View Agreement>`
    );
  }

  return (
    `🚗 *Return Reminder*\n` +
    `${modelHighlighted} (${plateHighlighted}) is scheduled to return at *${whenStr} MYT*.\n` +
    `Customer: ${numberHighlighted}\n` +
    `📄 <${agLink}|View Agreement>`
  );
}

export function buildUnifiedAlert(
  type: "MAINTENANCE" | "INSURANCE" | "AGREEMENT",
  items: any[],
  isTest: boolean = false
) {
  if (items.length === 0) return null;

  let title = "";
  let dashboardUrl = "";

  if (type === "MAINTENANCE") {
    title = "🛠️ Maintenance Alert";
    dashboardUrl = "https://jrv-admin.vercel.app/admin/maintenance";
  } else if (type === "INSURANCE") {
    title = "📄 Insurance/Roadtax Alert";
    dashboardUrl = "https://jrv-admin.vercel.app/admin/insurance";
  } else {
    title = "⏱️ Agreement Reminder";
    dashboardUrl = "https://jrv-admin.vercel.app/admin/agreements";
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: title,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${items.length} items* require attention.`,
      },
    },
    { type: "divider" },
  ];

  items.forEach((item) => {
    const carId = type === "AGREEMENT" ? item.car_id : item.id;

    const plateText = item.plate_number || "Unknown Car";
    const carModel = item.model || item.car_type || "";

    let msg = `*${plateText}* (${carModel})`;

    if (type === "AGREEMENT") {
      // Agreement Logic: Link to Agreement, WhatsApp
      const agLink = `https://jrv-admin.vercel.app/admin/agreements/${item.id}`;
      const phone = item.mobile || "";
      const cleanPhone = phone.replace(/\D/g, "");
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

      // Overwrite msg for Agreement to be more specific?
      // "Plate (Model) - Customer"
      msg = `*${plateText}* (${carModel})\n`;
      msg += `> 📄 <${agLink}|View Agreement> • ${
        waLink ? `<${waLink}|WhatsApp Customer>` : "No Phone"
      }`;

      if (item.end_time) {
        const t = new Date(item.end_time).toLocaleTimeString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          hour: "2-digit",
          minute: "2-digit",
        });
        msg += `\n> 🕒 Return at ${t}`;
      }
    } else {
      // Maintenance/Insurance Logic (Car Link)
      const carLink = `https://jrv-admin.vercel.app/admin/cars/${item.id}`;
      msg = `*<${carLink}|${plateText}>* (${carModel})`;

      if (item.issues && item.issues.length > 0) {
        msg += `\n> 🔧 ${item.issues.join(", ")}`;
      }

      if (item.insurance_days != null) {
        const days = item.insurance_days;
        const emoji = days <= 0 ? "🔴" : days <= 7 ? "🟠" : "🟡";
        msg += `\n> ${emoji} Insurance: Exp ${
          days <= 0 ? "EXPIRED" : "in " + days + " days"
        }`;
      }

      if (item.roadtax_days != null) {
        const days = item.roadtax_days;
        const emoji = days <= 0 ? "🔴" : days <= 7 ? "🟠" : "🟡";
        msg += `\n> ${emoji} Roadtax: Exp ${
          days <= 0 ? "EXPIRED" : "in " + days + " days"
        }`;
      }
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: msg,
      },
    });
  });

  blocks.push({ type: "divider" });

  // Action Buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Dashboard",
          emoji: true,
        },
        style: "primary",
        url: dashboardUrl,
      },
    ],
  });

  // Color Logic
  const colorMap = {
    MAINTENANCE: "#E01E5A", // Red
    INSURANCE: "#ECB22E", // Warning Yellow
    AGREEMENT: "#2C97DE", // Blue
  };
  const color = isTest ? "#36a64f" : colorMap[type];

  // Wrap in Attachment for Color
  return {
    attachments: [
      {
        color: color,
        blocks: blocks,
      },
    ],
  };
}
