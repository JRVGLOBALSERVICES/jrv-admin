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
