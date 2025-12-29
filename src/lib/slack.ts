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
  // 1. Clean Phone
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const whatsappLink = cleanPhone
    ? `<https://wa.me/${cleanPhone}|${phone}>`
    : phone;

  // 2. ✅ FORCE MALAYSIA TIME formatting
  // This converts the UTC date object to "10:30 PM" in KL time
  const timeStr = endTime.toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const modelHighlighted = `\`${carModel}\``;
  const plateHighlighted = `\`${plate}\``;
  const numberHighlighted = `\`${whatsappLink}\``;

  if (isExpired) {
    return `🚨 *OVERDUE ALERT* 🚨\nPlease check if car ${modelHighlighted} (${plateHighlighted}) is returned.\nScheduled Return: *${timeStr}*\nCustomer: ${numberHighlighted}`;
  }

  return `🚗 *Return Reminder*\n${modelHighlighted} (${plateHighlighted}) is scheduled to return today at *${timeStr}*.\nCustomer: ${numberHighlighted}`;
}
