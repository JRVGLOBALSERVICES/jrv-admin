import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import CarLogsClient from "./_components/CarLogsClient";
import { CarLogTable } from "./_components/CarLogTable";
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
  if (!gate.ok) redirect("/admin");

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

  // Map logs to standardized format
  const formattedLogs = rows.map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    actor_user_id: r.actor_user_id,
    actor_email: actorEmailMap.get(r.actor_user_id) || "",
    action: r.action,
    car_id: r.car_id,
    meta: r.meta
  }));

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
        <CarLogTable initialLogs={formattedLogs} />
      </div>
    </div>
  );
}
