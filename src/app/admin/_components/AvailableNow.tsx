"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";

type Row = {
  id: string;
  plate_number: string;
  location?: string | null;
  car_label: string;
};

// Glossy Pill Component
function Pill({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "dark" | "green" | "blue";
}) {
  const gradients = {
    green: "from-emerald-400 to-green-500 text-white shadow-emerald-200",
    blue: "from-blue-400 to-indigo-500 text-white shadow-blue-200",
    dark: "from-gray-700 to-gray-800 text-white shadow-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md bg-linear-to-r ${gradients[tone] || gradients.dark
        }`}
    >
      <span className="opacity-90 font-bold">{label}</span>
      <span className="bg-white/20 px-1.5 rounded-md tabular-nums">
        {value}
      </span>
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
  const [asOf, setAsOf] = useState("");

  useEffect(() => {
    setAsOf(format(new Date(), "HH:mm dd MMM"));
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) =>
      String(a.plate_number || "").localeCompare(String(b.plate_number || ""))
    );
  }, [rows]);

  const scroll = sorted.length > 10;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-200/50 flex flex-col h-full">
      {/* Glossy Header */}
      <div className="px-5 py-4 border-b border-emerald-100 bg-linear-to-r from-emerald-50 via-teal-50 to-white flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-black text-emerald-900 text-sm uppercase tracking-wide flex items-center gap-2">
            {title}
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-emerald-300 shadow-sm" />
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <span>Ready for rental</span>
            {asOf && <span className="opacity-70">• As of {asOf}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Pill label="Free" value={availableCount} tone="green" />
          <Link
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
            href="/admin/cars"
            title="View All Cars"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {!sorted.length ? (
        <div className="p-8 text-sm text-gray-400 text-center italic flex flex-col items-center gap-2">
          <span className="text-2xl">🌵</span>
          No cars available right now.
        </div>
      ) : (
        <div
          className={scroll ? "max-h-105 overflow-y-auto custom-scrollbar" : ""}
        >
          <div className="divide-y divide-gray-50">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="p-3 flex items-center justify-between hover:bg-emerald-50/30 transition-colors text-sm group"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                    {r.plate_number || "—"}
                    {r.location && (
                      <span className="text-[9px] font-normal text-gray-600 border px-1.5 rounded-md bg-gray-50">
                        {r.location}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate font-bold">
                    {r.car_label || "—"}
                  </div>
                </div>

                <Link
                  href={`/admin/cars/${r.id}`}
                  className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  OPEN
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
