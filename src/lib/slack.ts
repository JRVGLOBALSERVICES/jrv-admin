// src/lib/slack.ts

export async function sendSlackMessage(webhookUrl: string, text: string) {
  if (process.env.ENABLE_SLACK !== "true") return;

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

export function buildReminderText(
  carModel: string,
  plate: string,
  endTime: Date,
  phone: string,
  isExpired: boolean
) {
  // 1. Clean phone number for URL (remove +, spaces, dashes)
  const cleanPhone = (phone || "").replace(/\D/g, "");

  // 2. Create WhatsApp Link format: <url|text>
  const whatsappLink = cleanPhone
    ? `<https://wa.me/${cleanPhone}|${phone}>`
    : phone;

  // 3. Format Time
  const timeStr = endTime.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  });

  // 4. Apply "Orange" highlight using code blocks (`text`)
  const modelHighlighted = `\`${carModel}\``;
  const plateHighlighted = `\`${plate}\``;
  const numberHighlighted = `\`${whatsappLink}\``;

  if (isExpired) {
    return `Please check if car ${modelHighlighted} with registration number of ${plateHighlighted} is returned. Customer contact number is : ${numberHighlighted}`;
  }

  return `${modelHighlighted} with registration number of ${plateHighlighted} is scheduled to return today at *${timeStr}*. Customer contact number is : ${numberHighlighted}`;
}
