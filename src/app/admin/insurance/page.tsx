
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { InsuranceClient } from "./_components/InsuranceClient";

export const metadata: Metadata = {
    title: "Insurance & Roadtax | JRV Admin",
};

export const dynamic = "force-dynamic";

export default async function InsurancePage() {
    const gate = await requireAdmin();
    if (!gate.ok) redirect("/admin");

    const supabase = await createSupabaseServer();

    // Fetch ALL cars to sort/filter in JS (easier for multi-date logic)
    // or fetch checks in SQL. Given car count < 5000, JS filtering is fine and flexible.
    const { data: cars, error } = await supabase
        .from("cars")
        .select(`
      id, 
      plate_number, 
      insurance_expiry, 
      roadtax_expiry,
      catalog:catalog_id ( make, model ),
      primary_image_url
    `)
        // Let's get "not deleted". Actually status!=inactive might be better.
        // For now, let's just get all that are NOT sold/deleted (logic usually handled by status).
        // Let's fetch all except 'inactive' maybe? Or just fetch all.
        .neq("status", "inactive")
        .order("plate_number");

    if (error) {
        return <div className="p-8 text-red-500">Error loading cars: {error.message}</div>;
    }

    const processed = (cars || []).map((c: any) => ({
        id: c.id,
        plate: c.plate_number,
        make: c.catalog?.make || "",
        model: c.catalog?.model || "",
        image: c.primary_image_url,
        insurance_expiry: c.insurance_expiry,
        roadtax_expiry: c.roadtax_expiry,
    }));

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <InsuranceClient cars={processed} />
        </div>
    );
}
