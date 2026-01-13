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
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-200/50 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-amber-100 bg-linear-to-r from-amber-50 via-orange-50 to-white flex items-center justify-between">
        <div>
          <div className="font-black text-amber-900 text-sm uppercase tracking-wide">
            {title}
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
            Returning tomorrow
          </div>
        </div>
        <Link
          className="text-[10px] font-bold bg-white/80 text-amber-700 border border-amber-200 px-2 py-1 rounded-md hover:bg-amber-600 hover:text-white transition-colors shadow-sm"
          href="/admin/agreements"
        >
          View All
        </Link>
      </div>

      {!sorted.length ? (
        <div className="p-8 text-sm text-gray-400 text-center italic">
          No returns scheduled for tomorrow.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {sorted.map((r) => {
            const client =
              (r.customer_name && r.customer_name.trim()) || r.mobile || "—";
            return (
              <div
                key={r.agreement_id}
                className="p-3 flex items-center justify-between hover:bg-amber-50/30 transition-colors text-sm group"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                    {r.plate_number}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {r.car_label}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    Client:{" "}
                    <span className="font-medium text-gray-600">{client}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                    {fmtTime(r.date_end)}
                  </div>
                  <Link
                    href={`/admin/agreements/${r.agreement_id}`}
                    className="mt-1 block transition-all"
                  >
                    <span className="inline-block bg-white border border-amber-200 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm hover:bg-amber-50">
                      OPEN
                    </span>
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
