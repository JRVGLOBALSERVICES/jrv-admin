// src/lib/time.ts
import { formatInTimeZone } from "date-fns-tz";

export const APP_TZ = "Asia/Kuala_Lumpur";

export function fmtMY(d: Date, pattern = "dd MMM, hh:mm a") {
  return formatInTimeZone(d, APP_TZ, pattern);
}
