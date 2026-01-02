"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Check, FileDown } from "lucide-react";
import { useRole } from "@/lib/auth/useRole";
import { useDebouncedCallback } from "use-debounce"; // 1. Import this

// Unified Input Style
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";
const labelClass =
  "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block";

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

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-gray-100 text-gray-600 border-gray-200";
  const s = (status || "").toLowerCase();
  if (s === "new") color = "bg-blue-50 text-blue-700 border-blue-200";
  else if (s === "editted")
    color = "bg-amber-50 text-amber-700 border-amber-200";
  else if (s === "cancelled" || s === "deleted")
    color = "bg-red-50 text-red-700 border-red-200";
  else if (s === "completed")
    color = "bg-green-50 text-green-700 border-green-200";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${color}`}
    >
      {status || "Unknown"}
    </span>
  );
}

export default function AgreementsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleState = useRole();
  const isSuperadmin = roleState?.role === "superadmin";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ rows: [], total: 0, filters: {} });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? 1);
  // Get initial value from URL
  const initialQ = searchParams.get("q") ?? "";

  // 2. Local state for immediate typing response
  const [searchTerm, setSearchTerm] = useState(initialQ);

  const status = searchParams.get("status") ?? "";
  const plate = searchParams.get("plate") ?? "";
  const date = searchParams.get("date") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const depositFilter = searchParams.get("deposit") ?? "";

  // 3. Debounced callback for URL updates
  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateFilter("q", value);
  }, 500);

  // Sync local state if URL changes from outside (e.g. back button)
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams(searchParams.toString());
    fetch(`/admin/agreements/api?${qs.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json?.ok && json?.status === 401) {
          router.replace("/");
          return;
        }
        if (json.ok) setData({ ...json, rows: json.rows || [] });
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
    setSearchTerm(""); // Clear local input
    router.replace(pathname);
  };

  const toggleDepositRefunded = async (id: string, value: boolean) => {
    setData((prev: any) => ({
      ...prev,
      rows: (prev.rows || []).map((r: any) =>
        r.id === id ? { ...r, deposit_refunded: value } : r
      ),
    }));
    try {
      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_deposit_refunded", id, value }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
    } catch (e: any) {
      setData((prev: any) => ({
        ...prev,
        rows: (prev.rows || []).map((r: any) =>
          r.id === id ? { ...r, deposit_refunded: !value } : r
        ),
      }));
      alert("ERROR: " + (e?.message || "Unknown"));
    }
  };

  const forceDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) alert("ERROR: " + (json.error || "Unknown"));
      else window.location.reload();
    } catch (e: any) {
      alert("Network Error: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Agreements</h1>
          <p className="text-sm text-gray-500">Manage rentals and bookings</p>
        </div>
        <div className="flex gap-2 items-center">
          {isSuperadmin && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">
              SUPERADMIN
            </span>
          )}
          <Link href="/admin/agreements/new">
            <Button className="font-bold shadow-lg shadow-indigo-200">
              + New Agreement
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className={labelClass}>Search</label>
            {/* 4. Updated Input Field */}
            <input
              placeholder="Name, mobile, IC..."
              className={inputClass}
              value={searchTerm} // Use local state
              onChange={(e) => {
                setSearchTerm(e.target.value); // Immediate UI update
                debouncedSearch(e.target.value); // Delayed server update
              }}
            />
          </div>
          {/* ... Rest of your inputs remain exactly the same ... */}
          <div className="col-span-1">
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => updateFilter("date", e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>End Date</label>
            <input
              type="date"
              className={inputClass}
              value={endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">All</option>
              {["New", "Editted", "Cancelled", "Completed"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Plate</label>
            <select
              className={inputClass}
              value={plate}
              onChange={(e) => updateFilter("plate", e.target.value)}
            >
              <option value="">All</option>
              {(data.filters?.plates || []).map((p: any) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className={labelClass}>Deposit</label>
            <select
              className={inputClass}
              value={depositFilter}
              onChange={(e) => updateFilter("deposit", e.target.value)}
            >
              <option value="">All</option>
              <option value="only">With Deposit</option>
              <option value="not_paid">Deposit Not Refunded</option>
              <option value="paid">Deposit Refunded</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="col-span-2 md:col-span-1 md:w-auto h-10 bg-indigo-600 text-white font-bold px-4 rounded-lg shadow-md hover:bg-indigo-700 mb-px"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Car</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-gray-400 italic"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-gray-400 italic"
                  >
                    No agreements found matching criteria.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr
                    key={row.id}
                    className="hover:bg-indigo-50/30 transition group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">
                        {row.customer_name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {row.mobile}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {row.plate_number}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {row.car_label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-700">
                        {fmtDate(row.date_start)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        to {fmtDate(row.date_end)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      RM {row.total_price}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-gray-900">
                          RM {row.deposit_price || "0.00"}
                        </div>

                        {Number(row.deposit_price || 0) > 0 ? (
                          row.deposit_refunded ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                              <Check className="w-3.5 h-3.5" /> Refunded
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              Not refunded
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.whatsapp_url && (
                          <a
                            href={row.whatsapp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        )}
                        {row.agreement_url && (
                          <a
                            href={row.agreement_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                        )}
                        <Link href={`/admin/agreements/${row.id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs px-3"
                          >
                            Edit
                          </Button>
                        </Link>
                        {isSuperadmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              forceDelete(row.id);
                            }}
                            disabled={deletingId === row.id}
                            className="ml-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1.5 rounded hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === row.id ? "..." : "DEL"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
          <div>
            Total <strong>{data.total}</strong> records
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
              className="px-3 py-1.5 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Previous
            </button>
            <button
              disabled={rows.length < 20}
              onClick={() => updateFilter("page", String(page + 1))}
              className="px-3 py-1.5 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
