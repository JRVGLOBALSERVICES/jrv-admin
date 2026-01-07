"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { CarListRow } from "../page";

// Unified Styles
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";
const labelClass =
  "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block";

// --- Constants ---

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

// New Filters
const FEATURED_OPTIONS = ["All", "Featured Only", "Standard Only"] as const;
const PRICE_TYPES = ["All", "Promo Only", "Regular Price"] as const;

// --- Helper Functions ---

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

// --- Main Component ---

export default function CarsTable({ rows }: { rows: CarListRow[] }) {
  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [q, setQ] = useState("");

  // Filter States
  const [model, setModel] = useState<string>("All");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("All");
  const [bodyType, setBodyType] = useState<(typeof BODY)[number]>("All");

  // Replaced Location with Featured & Added Price Type
  const [featuredFilter, setFeaturedFilter] =
    useState<(typeof FEATURED_OPTIONS)[number]>("All");
  const [priceFilter, setPriceFilter] =
    useState<(typeof PRICE_TYPES)[number]>("All");

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setQ(value);
  }, 500);

  // Extract unique models for the dropdown
  const models = useMemo(() => {
    const all = rows
      .map((r) => (r.car_catalog?.model ?? "").trim())
      .filter(Boolean);
    return ["All", ...Array.from(new Set(all)).sort()];
  }, [rows]);

  // Filtering Logic
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return rows.filter((r) => {
      const m = (r.car_catalog?.model ?? "").trim();
      const mk = (r.car_catalog?.make ?? "").trim();
      const plate = (r.plate_number ?? "").trim();
      const st = (r.status ?? "").trim();
      const body = (r.body_type ?? "").trim();

      const isFeatured = r.is_featured;
      const hasPromo = r.promo_price !== null && r.promo_price > 0;

      // Dropdown Checks
      if (model !== "All" && m !== model) return false;
      if (status !== "All" && st !== status) return false;
      if (bodyType !== "All" && body !== bodyType) return false;

      // Featured Check
      if (featuredFilter === "Featured Only" && !isFeatured) return false;
      if (featuredFilter === "Standard Only" && isFeatured) return false;

      // Promo Price Check
      if (priceFilter === "Promo Only" && !hasPromo) return false;
      if (priceFilter === "Regular Price" && hasPromo) return false;

      // Search Text Check
      if (!needle) return true;
      return `${plate} ${mk} ${m}`.toLowerCase().includes(needle);
    });
  }, [rows, q, model, status, bodyType, featuredFilter, priceFilter]);

  // Reset Handler
  const handleClear = () => {
    setSearchTerm("");
    setQ("");
    setModel("All");
    setStatus("All");
    setBodyType("All");
    setFeaturedFilter("All");
    setPriceFilter("All");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
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

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
        {/* Changed grid-cols-6 to grid-cols-7 to fit new Price filter */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className={labelClass}>Search</label>
            <input
              className={inputClass}
              placeholder="Plate, make..."
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

          {/* Featured Filter */}
          <div>
            <label className={labelClass}>Featured</label>
            <select
              className={inputClass}
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as any)}
            >
              {FEATURED_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Price Type Filter */}
          <div>
            <label className={labelClass}>Price Type</label>
            <select
              className={inputClass}
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
            >
              {PRICE_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
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
              variant="indigo"
              onClick={handleClear}
              className="w-full h-10 bg-indigo-600 text-white font-bold px-4 rounded-lg shadow-md hover:bg-indigo-700 hover:text-white"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
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
                        <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                          {r.primary_image_url && (
                            <img
                              src={r.primary_image_url}
                              className="h-full w-full object-cover"
                              alt="Car"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 flex items-center gap-2 truncate">
                            {r.car_catalog?.model}
                            {r.is_featured && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {r.car_catalog?.make} • {r.body_type} • {r.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
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
