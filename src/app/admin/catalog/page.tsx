import { createSupabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  category: string | null;
  transmission: string | null;
  default_images: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

export default async function CatalogPage() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("car_catalog")
    .select("id, make, model, year, category, transmission, default_images, is_active, updated_at, created_at")
    .order("make", { ascending: true })
    .order("model", { ascending: true })
    .limit(1000);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Catalog</div>
          <div className="text-sm opacity-70">Make / Model source of truth.</div>
        </div>
        <Link href="/admin/catalog/new" className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 active:scale-[0.98]">
          + New
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border p-3 text-sm text-red-600">{error.message}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-225 w-full text-sm">
            <thead className="bg-black/3">
              <tr className="text-left">
                <th className="p-3">Make</th>
                <th className="p-3">Model</th>
                {/* <th className="p-3">Category</th> */}
                {/* <th className="p-3">Year</th> */}
                {/* <th className="p-3">Transmission</th> */}
                <th className="p-3">Default Image Added ?</th>
                {/* <th className="p-3">Active</th> */}
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data as CatalogRow[] | null)?.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.make ?? "—"}</td>
                  <td className="p-3">{r.model ?? "—"}</td>
                  {/* <td className="p-3">{r.category ?? "—"}</td> */}
                  {/* <td className="p-3">{r.year ?? "—"}</td>
                  <td className="p-3">{r.transmission ?? "—"}</td> */}
                  <td className="p-3">{r.default_images ? "Yes" : "No"}</td>
                  {/* <td className="p-3">{r.is_active ? "Yes" : "No"}</td> */}
                  <td className="p-3">
                    <Link className="underline" href={`/admin/catalog/${r.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
              {!data?.length ? (
                <tr><td colSpan={7} className="p-6 opacity-60">No catalog rows.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
