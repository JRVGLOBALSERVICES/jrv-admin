export function normalizePlate(input: any): string {
  return String(input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function plateEquals(a: any, b: any): boolean {
  if (!a || !b) return false;
  return normalizePlate(a) === normalizePlate(b);
}

/**
 * Returns a consistent display plate like "QDA 7102" or "QM 3601 N"
 * from any raw value. This is just cosmetic; do not use for matching.
 */
export function formatPlate(input: any): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  // If already has spaces, keep a cleaned version
  if (/\s/.test(raw)) return raw.replace(/\s+/g, " ").trim();

  const norm = normalizePlate(raw);
  // Heuristic: split into prefix letters, digits, optional suffix letters
  const m = norm.match(/^([A-Z]+)(\d+)([A-Z]*)$/);
  if (!m) return raw;
  const [, pre, digits, suf] = m;
  return [pre, digits, suf].filter(Boolean).join(" ").trim();
}
