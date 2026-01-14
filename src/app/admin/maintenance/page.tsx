import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import MaintenanceTable from "./_components/MaintenanceTable";
import { CarMaintenanceRow } from "./_components/types";
import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
    title: "Maintenance Control",
    description: "Track mileage and service intervals.",
    path: "/admin/maintenance",
    index: false,
});

export default async function MaintenancePage() {
    const gate = await requireAdmin();
    if (!gate.ok) redirect("/");

    const supabase = await createSupabaseServer();

    // Fetch cars
    const { data: cars, error } = await supabase
        .from("cars")
        .select(`
            id, 
            plate_number, 
            current_mileage, 
            next_service_mileage, 
            next_gear_oil_mileage, 
            next_tyre_mileage, 
            next_brake_pad_mileage, 
            status,
            track_insurance,
            car_catalog:catalog_id ( make, model )
        `)
        .neq("status", "inactive")
        .order("plate_number", { ascending: true });

    if (error) {
        console.error("Maintenance fetch error:", error);
        return (
            <div className="p-8 text-red-500">
                <h3 className="font-bold">Failed to load car data</h3>
                <pre className="mt-2 text-xs bg-red-50 p-4 rounded overflow-auto">
                    {JSON.stringify(error, null, 2)}
                </pre>
            </div>
        );
    }

    // Transform to match row type (handle nulls with defaults if necessary)
    const rows: CarMaintenanceRow[] = (cars || []).map((c: any) => {
        const make = c.car_catalog?.make || "";
        const model = c.car_catalog?.model || "";
        const carLabel = (make + " " + model).trim() || "Unknown Car";

        return {
            id: c.id,
            plate_number: c.plate_number,
            car_type: carLabel,
            current_mileage: c.current_mileage ?? 100000,
            next_service_mileage: c.next_service_mileage ?? 110000,
            next_gear_oil_mileage: c.next_gear_oil_mileage ?? 140000,
            next_tyre_mileage: c.next_tyre_mileage ?? 120000,
            next_brake_pad_mileage: c.next_brake_pad_mileage ?? 120000,
            status: c.status,
            track_insurance: c.track_insurance,
        };
    });

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <Wrench size={28} />
                        </div>
                        Maintenance Control
                    </div>
                    <div className="text-sm text-gray-500 font-medium pl-14">
                        Track mileage and service intervals for the fleet.
                    </div>
                </div>
            </div>

            <MaintenanceTable rows={rows} />
        </div>
    );
}
