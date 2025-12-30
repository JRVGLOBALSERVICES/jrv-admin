import type { SiteEventRow } from "@/app/admin/site-events/_components/types";

function safeParseProps(p: any) {
  if (!p) return {};
  if (typeof p === "object") return p;
  if (typeof p === "string") {
    try {
      return JSON.parse(p);
    } catch {
      return {};
    }
  }
  return {};
}

function isCarDetailPath(p?: string | null) {
  if (!p) return false;
  if (!p.startsWith("/cars/")) return false;
  return p !== "/cars" && p !== "/cars/";
}

function slugFromCarPath(p: string) {
  return p.replace(/^\/cars\//, "").replace(/\/$/, "");
}

function humanizeSlug(slug: string) {
  return slug.split("-").filter(Boolean).join(" ").trim();
}

export function extractModelKey(row: SiteEventRow): string | null {
  const props = safeParseProps(row.props);

  const make = String(props?.make || "").trim();
  const model = String(props?.model || "").trim();
  if (make && model) return `${make} ${model}`.trim();

  if (model) return model;

  const slug = String(props?.slug || "").trim();
  if (slug) return humanizeSlug(slug);

  if (isCarDetailPath(row.page_path)) {
    const s = slugFromCarPath(row.page_path!);
    if (s) return humanizeSlug(s);
  }

  return null;
}

export function computeTopModels(rows: SiteEventRow[]) {
  const counts = new Map<string, number>();

  for (const r of rows) {
    const isCarDetailsEvent =
      (r.event_name === "page_view" || r.event_name === "site_load") &&
      isCarDetailPath(r.page_path);

    const isRelevant =
      r.event_name === "model_click" ||
      r.event_name === "whatsapp_click" ||
      r.event_name === "phone_click" ||
      isCarDetailsEvent;

    if (!isRelevant) continue;

    const key = extractModelKey(r);
    if (!key) continue;

    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
