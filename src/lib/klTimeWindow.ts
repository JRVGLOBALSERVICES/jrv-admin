// KL (UTC+8) 6:00 AM business window helpers.
// All returned Dates are UTC Dates (safe to use with Supabase timestamptz).

const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BUSINESS_START_HOUR = 6;

function toKlMs(nowUtc: Date) {
  return nowUtc.getTime() + KL_OFFSET_MS;
}

/**
 * Returns the UTC Date for the most recent KL 06:00 boundary.
 * If KL time is before 06:00, it returns yesterday 06:00.
 */
export function windowStart6amKlUtc(nowUtc: Date = new Date()) {
  const klNowMs = toKlMs(nowUtc);
  const klNow = new Date(klNowMs);
  const y = klNow.getUTCFullYear();
  const m = klNow.getUTCMonth();
  const d = klNow.getUTCDate();

  let startKlMs = Date.UTC(y, m, d, BUSINESS_START_HOUR, 0, 0, 0);
  if (klNowMs < startKlMs) startKlMs -= DAY_MS;

  // Convert KL-ms back to UTC-ms
  return new Date(startKlMs - KL_OFFSET_MS);
}

/**
 * Returns a { start, end } range aligned to KL 06:00 boundaries.
 * - end = current window start
 * - start = end - (days * 24h)
 */
export function rangeDays6amKlUtc(nowUtc: Date, days: number) {
  const end = windowStart6amKlUtc(nowUtc);
  const start = new Date(end.getTime() - days * DAY_MS);
  return { start, end };
}

/**
 * Returns the current business window { start, end }.
 * Start = most recent KL 6am.
 * End = Start + 24h.
 * This covers "Now" if we are in the middle of a business day.
 */
export function currentBusinessDay(nowUtc: Date) {
  const start = windowStart6amKlUtc(nowUtc);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

export function rangeKeyToIso(rangeKey: string, nowUtc: Date = new Date()) {
  if (rangeKey === "7d") {
    const { start, end } = rangeDays6amKlUtc(nowUtc, 7);
    return { initialFrom: start.toISOString(), initialTo: end.toISOString(), rangeKey: "7d" as const };
  }

  if (rangeKey === "30d") {
    const { start, end } = rangeDays6amKlUtc(nowUtc, 30);
    return { initialFrom: start.toISOString(), initialTo: end.toISOString(), rangeKey: "30d" as const };
  }

  // default: 24h returns CURRENT business day (including now)
  const { start, end } = currentBusinessDay(nowUtc);
  return { initialFrom: start.toISOString(), initialTo: end.toISOString(), rangeKey: "24h" as const };
}
