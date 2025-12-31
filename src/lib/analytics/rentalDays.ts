const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDate(d: any): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function toMs(v: any): number {
  const d = v instanceof Date ? v : new Date(v);
  return isValidDate(d) ? d.getTime() : NaN;
}

/**
 * Count "days running" inside a window based on overlap between
 * [start,end] and [windowStart,windowEnd] (inclusive).
 *
 * Returns 0 if there is no overlap.
 * Returns at least 1 if there is any overlap.
 */
export function rentalDaysInWindow(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  windowStart: Date,
  windowEnd: Date
): number {
  const a = toMs(startIso);
  const b = toMs(endIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;

  const ws = windowStart.getTime();
  const we = windowEnd.getTime();

  const start = Math.max(Math.min(a, b), ws);
  const end = Math.min(Math.max(a, b), we);

  if (end < start) return 0;

  const ms = end - start + 1; // inclusive
  return Math.max(1, Math.ceil(ms / DAY_MS));
}

/**
 * Overlap fraction in days (can be decimal), useful for utilization.
 */
export function rentalDaysFloatInWindow(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  windowStart: Date,
  windowEnd: Date
): number {
  const a = toMs(startIso);
  const b = toMs(endIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;

  const ws = windowStart.getTime();
  const we = windowEnd.getTime();

  const start = Math.max(Math.min(a, b), ws);
  const end = Math.min(Math.max(a, b), we);

  if (end < start) return 0;

  const ms = end - start;
  return ms / DAY_MS;
}
