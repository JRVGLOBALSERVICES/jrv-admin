"use client";

import Link from "next/link";
import { useMemo } from "react";

type Row = {
  id: string;
  plate_number: string;
  location?: string | null;
  car_label: string;
};

function Pill({ label, value, tone = "dark" }: { label: string; value: number; tone?: "dark" | "green" | "blue" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-900 border-emerald-200"
      : tone === "blue"
      ? "bg-blue-100 text-blue-900 border-blue-200"
      : "bg-gray-100 text-gray-900 border-gray-200";

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${cls}`}>
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

export default function AvailableNow({
  title,
  rows,
  availableCount,
  rentedCount,
}: {
  title: string;
  rows: Row[];
  availableCount: number;
  rentedCount: number;
}) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => String(a.plate_number || "").localeCompare(String(b.plate_number || "")));
  }, [rows]);

  const scroll = sorted.length > 10;

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-emerald-50">
        <div className="min-w-0">
          <div className="font-bold text-emerald-900">{title}</div>
          <div className="text-xs text-emerald-700 opacity-80">Cars ready to rent right now</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ✅ header pill badges */}
          <Pill label="Rented" value={rentedCount} tone="blue" />
          <Pill label="Available" value={availableCount} tone="green" />

          <Link className="text-xs font-semibold text-emerald-800 hover:underline ml-1" href="/admin/cars">
            View
          </Link>
        </div>
      </div>

      {!sorted.length ? (
        <div className="p-6 text-sm opacity-60 text-center">No cars available right now.</div>
      ) : (
        <div className={scroll ? "max-h-105 overflow-y-auto" : ""}>
          <div className="divide-y divide-gray-100">
            {sorted.map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">{r.plate_number || "—"}</div>
                  <div className="text-xs text-gray-500 truncate">{r.car_label || "—"}</div>
                  {r.location ? <div className="text-[11px] text-gray-400">Location: {r.location}</div> : null}
                </div>

                <Link
                  href={`/admin/cars/${r.id}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline shrink-0"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
