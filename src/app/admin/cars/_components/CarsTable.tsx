"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CarListRow } from "../page";

const LOCATIONS = [
  "All",
  "Seremban",
  "Seremban 2",
  "Seremban 3",
  "Nilai",
  "Port Dickson",
  "KLIA",
  "Kuala Lumpur",
] as const;
const STATUS = [
  "All",
  "available",
  "rented",
  "maintenance",
  "inactive",
  "website-display-only",
] as const;
const BODY = [
  "All",
  "Local",
  "Hatchback",
  "Sedan",
  "MPV/Van",
  "SUV",
  "Sports",
] as const;

function rm(v?: number | null) {
  if (v == null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `RM ${n.toLocaleString("en-MY")}`;
}

function asArr(v: any): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs opacity-60 mb-1">{children}</div>;
}

export default function CarsTable({ rows }: { rows: CarListRow[] }) {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("All");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("All");
  const [bodyType, setBodyType] = useState<(typeof BODY)[number]>("All");
  const [model, setModel] = useState<string>("All");

  const models = useMemo(() => {
    const all = rows
      .map((r) => (r.car_catalog?.model ?? "").trim())
      .filter(Boolean);
    return ["All", ...uniq(all)];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return rows.filter((r) => {
      const m = (r.car_catalog?.model ?? "").trim();
      const mk = (r.car_catalog?.make ?? "").trim();
      const plate = (r.plate_number ?? "").trim();
      const loc = (r.location ?? "").trim();
      const st = (r.status ?? "").trim();
      const body = (r.body_type ?? "").trim();

      if (location !== "All" && loc !== location) return false;
      if (status !== "All" && st !== status) return false;
      if (bodyType !== "All" && body !== bodyType) return false;
      if (model !== "All" && m !== model) return false;

      if (!needle) return true;

      const hay = `${plate} ${mk} ${m}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, location, status, bodyType, model]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Cars</div>
          <div className="text-sm opacity-70">
            Showing {filtered.length} / {rows.length}
          </div>
        </div>

        <Link
          href="/admin/cars/new"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 active:scale-[0.98]"
        >
          + New
        </Link>
      </div>

      {/* Filters (with labels) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <Label>Search</Label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Plate / Make / Model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div>
          <Label>Model</Label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Location</Label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={location}
            onChange={(e) => setLocation(e.target.value as any)}
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Status</Label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Body type</Label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value as any)}
          >
            {BODY.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-262.5 w-full text-sm">
          <thead className="bg-black/3">
            <tr className="text-left">
              <th className="p-3">Model</th>
              <th className="p-3">Plate</th>
              <th className="p-3">Daily</th>
              <th className="p-3">3 Days</th>
              <th className="p-3">Weekly</th>
              <th className="p-3">Monthly</th>
              <th className="p-3">Status</th>
              <th className="p-3">Edit</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => {
              const modelLabel = (r.car_catalog?.model ?? "").trim() || "—";
              const makeLabel = (r.car_catalog?.make ?? "").trim() || "—";

              const gallery = asArr(r.images);
              const galleryCount = gallery.length;

              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-black/5 overflow-hidden shrink-0 border">
                        {r.primary_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.primary_image_url}
                            alt={modelLabel}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium truncate">{modelLabel}</div>
                        <div className="text-[11px] opacity-60 truncate">
                          {makeLabel} • {r.body_type ?? "—"} •{" "}
                          {r.location ?? "—"}
                        </div>
                      </div>

                      <span className="ml-auto rounded-full border px-2 py-1 text-xs">
                        {galleryCount} imgs
                      </span>
                    </div>
                  </td>

                  <td className="p-3 font-medium">{r.plate_number ?? "—"}</td>
                  <td className="p-3">{rm(r.daily_price)}</td>
                  <td className="p-3">{rm((r as any).price_3_days)}</td>
                  <td className="p-3">{rm((r as any).weekly_price)}</td>
                  <td className="p-3">{rm((r as any).monthly_price)}</td>

                  <td className="p-3">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {r.status ?? "—"}
                    </span>
                  </td>

                  <td className="p-3">
                    <Link className="underline" href={`/admin/cars/${r.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!filtered.length ? (
              <tr>
                <td className="p-6 opacity-60" colSpan={8}>
                  No cars match the filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
