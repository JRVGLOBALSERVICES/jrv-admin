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

  // If current time is before 6am, the "business day" started yesterday 6am
  if (klNowMs < startKlMs) {
    startKlMs -= DAY_MS;
  }

  // Convert KL-ms back to UTC-ms
  return new Date(startKlMs - KL_OFFSET_MS);
}

/**
 * Weekly (WTD): Starts 6am on the most recent Monday.
 * Ends: Tomorrow 6am (relative to current business day).
 */
export function currentWeek6amKlUtc(nowUtc: Date) {
  const dailyStart = windowStart6amKlUtc(nowUtc);
  // dailyStart is in UTC, but represents KL 06:00 of "Today".
  // We need to find the Monday of this week relative to KL Time.

  // Get KL Day of Week (0=Sun, 1=Mon...)
  const klTime = new Date(dailyStart.getTime() + KL_OFFSET_MS);
  const day = klTime.getUTCDay(); // 0-6

  // Calculate days to subtract to get to Monday.
  // If Mon (1), sub 0.
  // If Tue (2), sub 1.
  // If Sun (0), sub 6.
  const diffToMon = day === 0 ? 6 : day - 1;

  const startMs = dailyStart.getTime() - diffToMon * DAY_MS;
  const start = new Date(startMs);
  const end = new Date(dailyStart.getTime() + DAY_MS); // Tomorrow 6am

  return { start, end };
}

/**
 * Returns a { start, end } range aligned to KL 06:00 boundaries.
 * - end = current window start + 24h (Tomorrow 6am)
 * - start = end - (days * 24h)
 * Used for "Last X Days" logic (Quarterly, Yearly).
 */
export function rangeDays6amKlUtc(nowUtc: Date, days: number) {
  const todayStart = windowStart6amKlUtc(nowUtc);
  const end = new Date(todayStart.getTime() + DAY_MS); // Tomorrow 6am
  const start = new Date(end.getTime() - days * DAY_MS);
  return { start, end };
}

/**
 * Monthly (MTD): Starts 6am on the 1st of Current KL Month.
 * Ends: Tomorrow 6am.
 */
export function currentMonth6amKlUtc(nowUtc: Date) {
  const dailyStart = windowStart6amKlUtc(nowUtc);
  const klTime = new Date(dailyStart.getTime() + KL_OFFSET_MS);

  const y = klTime.getUTCFullYear();
  const m = klTime.getUTCMonth();

  const startKlMs = Date.UTC(y, m, 1, BUSINESS_START_HOUR, 0, 0, 0);
  const start = new Date(startKlMs - KL_OFFSET_MS);
  const end = new Date(dailyStart.getTime() + DAY_MS); // Tomorrow 6am

  return { start, end };
}

/**
 * Returns the current business window { start, end }.
 * Start = most recent KL 6am.
 * End = Start + 24h.
 */
export function currentBusinessDay(nowUtc: Date) {
  const start = windowStart6amKlUtc(nowUtc);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

export function rangeKeyToIso(rangeKey: string, nowUtc: Date = new Date()) {
  if (rangeKey === "7d") {
    // Interpreted as "Weekly" (WTD)
    const { start, end } = currentWeek6amKlUtc(nowUtc);
    return {
      initialFrom: start.toISOString(),
      initialTo: end.toISOString(),
      rangeKey: "7d" as const,
    };
  }

  if (rangeKey === "30d") {
    // Interpreted as "Monthly" (MTD)
    const { start, end } = currentMonth6amKlUtc(nowUtc);
    return {
      initialFrom: start.toISOString(),
      initialTo: end.toISOString(),
      rangeKey: "30d" as const,
    };
  }

  // default: 24h returns CURRENT business day (including now)
  const { start, end } = currentBusinessDay(nowUtc);
  return {
    initialFrom: start.toISOString(),
    initialTo: end.toISOString(),
    rangeKey: "24h" as const,
  };
}
