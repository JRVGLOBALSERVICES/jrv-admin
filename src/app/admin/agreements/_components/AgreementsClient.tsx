"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileDown, CalendarDays } from "lucide-react"; // Generic icons

// ✅ Custom WhatsApp Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// ✅ Updated Helper: Clearer Date + Time format
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric", // Added year for clarity
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-gray-100 text-gray-600";
  const s = (status || "").toLowerCase();

  if (s === "new") color = "bg-blue-100 text-blue-700";
  else if (s === "confirmed") color = "bg-green-100 text-green-700";
  else if (s === "editted") color = "bg-amber-100 text-amber-700";
  else if (s === "cancelled" || s === "deleted") color = "bg-red-100 text-red-700";
  else if (s === "active") color = "bg-emerald-100 text-emerald-800";
  else if (s === "completed") color = "bg-gray-800 text-white";

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${color}`}>
      {status || "Unknown"}
    </span>
  );
}

export default function AgreementsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ rows: [], total: 0, filters: {} });

  const page = Number(searchParams.get("page") ?? 1);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const plate = searchParams.get("plate") ?? "";
  const date = searchParams.get("date") ?? "";

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(searchParams.toString());
    fetch(`/admin/agreements/api?${qs.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  const updateFilter = (key: string, val: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val);
    else sp.delete(key);
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const clearFilters = () => {
    router.replace(pathname);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agreements</h1>
          <p className="text-sm text-gray-500">Manage rentals and bookings</p>
        </div>
        <Link href="/admin/agreements/new">
          <Button sound="on" haptics="on">
            + New Agreement
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50">
        <div className="md:col-span-1">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Search</label>
          <input
            placeholder="Name, mobile, IC..."
            className="w-full border rounded-lg px-3 py-2 text-sm h-10 focus:ring-2 focus:ring-black/20 outline-none"
            value={q}
            onChange={(e) => updateFilter("q", e.target.value)}
          />
        </div>
        
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white focus:ring-2 focus:ring-black/20 outline-none"
            value={date}
            onChange={(e) => updateFilter("date", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white"
            value={status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {["Active", "New", "Confirmed", "Editted", "Cancelled", "Completed"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Plate</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white"
            value={plate}
            onChange={(e) => updateFilter("plate", e.target.value)}
          >
            <option value="">All Plates</option>
            {(data.filters?.plates || []).map((p: any) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={clearFilters}
            className="text-xs h-10 w-full"
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Car / Plate</th>
                
                {/* ✅ Renamed Column Header */}
                <th className="px-4 py-3">Rental Period</th>
                
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No agreements found.</td>
                </tr>
              ) : (
                data.rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{row.customer_name}</div>
                      <div className="text-xs text-gray-500">{row.mobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.plate_number}</div>
                      <div className="text-xs text-gray-500">{row.car_label}</div>
                    </td>
                    
                    {/* ✅ Updated Cell: Explicit Start and End times */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-xs font-semibold text-gray-800">
                          {fmtDate(row.date_start)}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="opacity-70">to</span>
                          <span className="font-medium text-gray-600">{fmtDate(row.date_end)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-900">
                      RM {row.total_price}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.whatsapp_url && (
                          <a 
                            href={row.whatsapp_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full hover:bg-green-50 text-green-600 transition-colors"
                            title="Send WhatsApp"
                          >
                            <WhatsAppIcon className="w-5 h-5" />
                          </a>
                        )}

                        {row.agreement_url && (
                          <a 
                            href={row.agreement_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-5 h-5" />
                          </a>
                        )}

                        <Link href={`/admin/agreements/${row.id}`}>
                          <Button variant="secondary" size="sm" className="h-8 text-xs">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>Total {data.total} records</div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={data.rows.length < 20}
              onClick={() => updateFilter("page", String(page + 1))}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}