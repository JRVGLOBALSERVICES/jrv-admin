// src/lib/phone.ts
export function normalizePhoneInternational(input: string) {
  const raw = String(input ?? "").trim();
  if (!raw) throw new Error("Mobile required");

  let s = raw.replace(/[^\d+]/g, "");

  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  if (s.startsWith("0") && !s.startsWith("+")) {
    if (s.startsWith("01")) s = `+60${s.slice(1)}`;
  }

  if (!s.startsWith("+")) s = `+${s}`;

  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) throw new Error("Invalid mobile number");

  return `+${digits}`;
}

export function buildWhatsAppUrl(mobileE164: string, message: string) {
  const phone = normalizePhoneInternational(mobileE164).replace("+", "");
  const text = encodeURIComponent(String(message ?? ""));
  return `https://wa.me/${phone}?text=${text}`;
}
