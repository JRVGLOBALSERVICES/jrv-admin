"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  car_type: string | null;
  plate_number: string | null;
  mobile: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  total_price: number | null;
  customer_name: string | null;
};

// Icons
function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "EXPIRED";

  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600) % 24;
  const d = Math.floor(totalSec / 86400);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ExpiringSoon({
  title,
  subtitle,
  rows,
  error,
}: {
  title: string;
  subtitle?: string;
  rows: Row[];
  error?: string | null;
}) {
  // ✅ This guarantees re-render ticks on the client
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    const remaining = (endIso?: string | null) => {
      if (!endIso) return Number.POSITIVE_INFINITY;
      const end = new Date(endIso).getTime();
      return end - nowMs;
    };

    return [...rows].sort((a, b) => remaining(a.date_end) - remaining(b.date_end));
  }, [rows, nowMs]);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-red-50">
        <div>
          <div className="font-bold text-red-900">{title}</div>
          {subtitle ? (
            <div className="text-xs text-red-700 opacity-80">{subtitle}</div>
          ) : null}
        </div>
        <Link className="text-xs font-semibold text-red-800 hover:underline" href="/admin/agreements">
          View All
        </Link>
      </div>

      {error && <div className="p-4 text-sm text-red-600">{error}</div>}

      {!sorted.length ? (
        <div className="p-6 text-sm opacity-60 text-center">No agreements expiring soon.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((r) => {
            console.log(r)
            const endMs = r.date_end ? new Date(r.date_end).getTime() : 0;
            const ms = Math.max(0, endMs - nowMs);
            const hoursLeft = ms / (1000 * 60 * 60);
            const isExpired = ms <= 0;
            const isUrgent = hoursLeft <= 1 && !isExpired;

            const mobileRaw = (r.mobile || "").replace(/\D/g, "");
            const whatsappLink = mobileRaw ? `https://wa.me/${mobileRaw}` : "#";
            const callLink = mobileRaw ? `tel:${mobileRaw}` : "#";

            return (
              <div
                key={r.id}
                className={`p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition ${
                  isUrgent ? "bg-red-50/50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-gray-900">{r.plate_number || "—"}</div>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                      {r.car_type || "—"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Client: <span className="font-medium text-gray-800">{r.customer_name || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "px-3 py-1.5 rounded-md text-xs font-bold tabular-nums border",
                      isExpired
                        ? "bg-gray-100 text-gray-500 border-gray-200"
                        : isUrgent
                        ? "animate-pulse bg-red-600 text-white border-red-600 shadow-md"
                        : "bg-amber-100 text-amber-800 border-amber-200",
                    ].join(" ")}
                  >
                    {formatCountdown(endMs - nowMs)}
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition"
                      title="WhatsApp Now"
                      onClick={(e) => {
                        if (!mobileRaw) e.preventDefault();
                      }}
                    >
                      <WhatsAppIcon />
                    </a>
                    <a
                      href={callLink}
                      className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition"
                      title="Call Now"
                      onClick={(e) => {
                        if (!mobileRaw) e.preventDefault();
                      }}
                    >
                      <PhoneIcon />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
