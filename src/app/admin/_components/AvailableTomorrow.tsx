"use client";

import Link from "next/link";
import { useMemo } from "react";

type Row = {
  agreement_id: string;
  car_id: string;
  plate_number: string;
  car_label: string;
  customer_name: string | null;
  mobile: string | null;
  date_end: string | null;
  status: string | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AvailableTomorrow({
  title,
  rows,
}: {
  title: string;
  rows: Row[];
}) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const A = a.date_end ? new Date(a.date_end).getTime() : Infinity;
      const B = b.date_end ? new Date(b.date_end).getTime() : Infinity;
      return A - B;
    });
  }, [rows]);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-amber-50">
        <div>
          <div className="font-bold text-amber-900">{title}</div>
          <div className="text-xs text-amber-700 opacity-80">
            Only cars currently rented that end tomorrow
          </div>
        </div>
        <Link
          className="text-xs font-semibold text-amber-800 hover:underline"
          href="/admin/agreements"
        >
          View
        </Link>
      </div>

      {!sorted.length ? (
        <div className="p-6 text-sm opacity-60 text-center">
          No cars becoming available tomorrow.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((r) => {
            const client =
              (r.customer_name && r.customer_name.trim()) || r.mobile || "—";
            return (
              <div
                key={r.agreement_id}
                className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">{r.plate_number}</div>
                  <div className="text-xs text-gray-500 truncate">{r.car_label}</div>
                  <div className="text-[11px] text-gray-500">
                    Client: <span className="font-medium text-gray-800">{client}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-800">
                    Frees at {fmtTime(r.date_end)}
                  </div>
                  <Link
                    href={`/admin/agreements/${r.agreement_id}`}
                    className="text-xs font-semibold text-amber-700 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
