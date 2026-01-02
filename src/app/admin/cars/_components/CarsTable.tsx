"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { CarListRow } from "../page";

// Unified Styles from Agreements
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";
const labelClass =
  "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block";

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
  return `RM ${Number(v).toLocaleString("en-MY")}`;
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-gray-100 text-gray-600 border-gray-200";
  const s = (status || "").toLowerCase();
  if (s === "available") color = "bg-green-50 text-green-700 border-green-200";
  else if (s === "rented") color = "bg-blue-50 text-blue-700 border-blue-200";
  else if (s === "maintenance" || s === "inactive")
    color = "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${color}`}
    >
      {status}
    </span>
  );
}

export default function CarsTable({ rows }: { rows: CarListRow[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("All");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("All");
  const [bodyType, setBodyType] = useState<(typeof BODY)[number]>("All");
  const [model, setModel] = useState<string>("All");

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setQ(value);
  }, 500);

  const models = useMemo(() => {
    const all = rows
      .map((r) => (r.car_catalog?.model ?? "").trim())
      .filter(Boolean);
    return ["All", ...Array.from(new Set(all)).sort()];
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

      return `${plate} ${mk} ${m}`.toLowerCase().includes(needle);
    });
  }, [rows, q, location, status, bodyType, model]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Cars
          </h1>
          <p className="text-sm text-gray-500">
            Manage fleet, pricing, and visibility
          </p>
        </div>
        <Link href="/admin/cars/new">
          <Button className="font-bold shadow-lg shadow-indigo-200">
            + New Car
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className={labelClass}>Search</label>
            <input
              className={inputClass}
              placeholder="Plate, make, model..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <select
              className={inputClass}
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
            <label className={labelClass}>Location</label>
            <select
              className={inputClass}
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
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
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
            <label className={labelClass}>Body Type</label>
            <select
              className={inputClass}
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
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                setQ("");
                setLocation("All");
                setStatus("All");
                setBodyType("All");
                setModel("All");
              }}
              className="w-full h-10 bg-indigo-600 text-white font-bold px-4 rounded-lg shadow-md hover:bg-indigo-700 hover:text-white"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">Daily Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-gray-400 italic"
                  >
                    No cars found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-indigo-50/30 transition group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                          {r.primary_image_url && (
                            <img
                              src={r.primary_image_url}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {r.car_catalog?.model}
                            {r.is_featured && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {r.car_catalog?.make} • {r.body_type} • {r.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">
                      {r.plate_number}
                    </td>
                    <td className="px-4 py-3">
                      {r.promo_price ? (
                        <div className="flex flex-col">
                          <span className="text-red-600 font-black">
                            {rm(r.promo_price)}
                          </span>
                          <span className="text-[10px] line-through opacity-40">
                            {rm(r.daily_price)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-gray-900">
                          {rm(r.daily_price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status || "—"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/cars/${r.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-bold px-4"
                        >
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-gray-50/50 text-xs text-gray-500 font-medium">
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{rows.length}</strong> cars
        </div>
      </Card>
    </div>
  );
}
