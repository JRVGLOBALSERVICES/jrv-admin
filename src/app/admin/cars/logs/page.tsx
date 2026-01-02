import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import CarLogsClient from "./_components/CarLogsClient";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowRight } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Car Audit Logs",
  description: "View edit/delete actions for cars.",
  path: "/admin/cars/logs",
  index: false,
});

const IGNORE_FIELDS = ["updated_at", "created_at", "id", "created_by", "meta"];

const FIELD_LABELS: Record<string, string> = {
  is_featured: "Featured Status",
  daily_rate: "Daily Rate",
  status: "Car Status",
  plate_number: "Plate Number",
  color: "Color",
  brand: "Brand",
  model: "Model",
};

export default async function CarLogsPage({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServer();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/");
  const gate = await requireSuperadmin();
  if (!gate.ok) redirect("/dashboard");

  const [logsRes, adminsRes, carsRes] = await Promise.all([
    supabase.from("car_audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }),
    supabase.from("admin_users").select("user_id, email"),
    supabase.from("cars").select("id, plate_number")
  ]);

  const actorEmailMap = new Map(adminsRes.data?.map(a => [a.user_id, a.email]));
  const plateMap = new Map(carsRes.data?.map(c => [c.id, c.plate_number]));

  const deduplicatedRows = (logsRes.data || []).reduce((acc: any[], current: any) => {
    const isUpdate = current.action.includes("UPDATE") && current.meta?.old && current.meta?.new;
    const diffs = isUpdate ? Object.keys(current.meta.new).filter(key => 
      !IGNORE_FIELDS.includes(key) && String(current.meta.old[key]) !== String(current.meta.new[key])
    ) : ["SNAPSHOT"];

    if (current.action.includes("UPDATE") && diffs.length === 0) return acc;

    const last = acc[acc.length - 1];
    if (last && last.car_id === current.car_id && 
        new Date(last.created_at).getTime() === new Date(current.created_at).getTime() && 
        !current.actor_user_id) {
      return acc;
    }

    acc.push(current);
    return acc;
  }, []);

  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = Math.max(10, Number(sp.page_size || 25));
  const rows = deduplicatedRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(deduplicatedRows.length / pageSize);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight">
            <ShieldAlert className="text-blue-600" size={28} />
            Car Audit Logs
          </div>
        </div>
        <Link href="/admin/cars" className="rounded-lg border px-3 py-2 text-sm bg-white font-bold shadow-sm transition hover:bg-gray-50">
          ← Back
        </Link>
      </div>

      <CarLogsClient 
        initial={{ ...sp, page, page_size: pageSize }} 
        meta={{ total: deduplicatedRows.length, totalPages }} 
        options={{ actors: adminsRes.data || [], cars: carsRes.data || [] }} 
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* MOBILE SCROLL FIX START */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4 w-40">Timestamp</th>
                <th className="p-4 w-32">Action</th>
                <th className="p-4 w-32">Car</th>
                <th className="p-4 w-48">Actor</th>
                <th className="p-4">Detailed Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r: any) => {
                const email = actorEmailMap.get(r.actor_user_id);
                const plate = plateMap.get(r.car_id || "") || "Unknown Car";
                const isUpdate = r.action.includes("UPDATE") && r.meta?.old && r.meta?.new;
                const diffs = isUpdate ? Object.keys(r.meta.new).filter(key => 
                  !IGNORE_FIELDS.includes(key) && String(r.meta.old[key]) !== String(r.meta.new[key])
                ) : [];

                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors align-top">
                    <td className="p-4 text-[11px] text-gray-400 font-mono whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("en-MY", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                        r.action.includes("DELETE") ? "bg-red-50 text-red-700 border-red-200" :
                        r.action.includes("UPDATE") ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {r.action.replace(/_CAR/g, "")}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-700 text-xs whitespace-nowrap">{plate}</td>
                    <td className="p-4 text-xs text-gray-600 font-semibold italic whitespace-nowrap">
                      {email || (r.actor_user_id ? "Unknown Admin" : "System")}
                    </td>
                    <td className="p-4">
                      {isUpdate && diffs.length > 0 ? (
                        <div className="grid gap-3">
                          {diffs.map(key => (
                            <div key={key} className="flex flex-col gap-1 border-l-2 border-gray-200 pl-4 py-0.5">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                  {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-medium">
                                  {String(r.meta.old[key] ?? "None")}
                                </span>
                                <ArrowRight size={14} className="text-gray-300" strokeWidth={3} />
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                                  {String(r.meta.new[key] ?? "None")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <details className="group">
                          <summary className="cursor-pointer text-[10px] font-black text-blue-600 uppercase tracking-widest list-none">View Snapshot</summary>
                          <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] bg-gray-900 text-gray-300 rounded-xl p-4 font-mono border border-gray-800">
                            {JSON.stringify(r.meta?.new || r.meta?.old || r.meta || {}, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* MOBILE SCROLL FIX END */}
      </div>
    </div>
  );
}
