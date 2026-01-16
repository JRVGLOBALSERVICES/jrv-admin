import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wrench, ShieldCheck, Search, Filter } from "lucide-react";
import MaintenanceTable, { CarMaintenanceRow } from "./_components/MaintenanceTable";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";

// Style matching Agreements page
const inputClass =
    "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10";
const labelClass =
    "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block";

export default async function MaintenancePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const gate = await requireAdmin();
    if (!gate.ok) redirect("/");

    const sp = await searchParams;
    const q = String(sp.q ?? "").toLowerCase();
    const plateFilter = String(sp.plate ?? "");

    const supabase = await createSupabaseServer();

    // Fetch cars
    const { data: cars, error } = await supabase
        .from("cars")
        .select(`
            id, plate_number, current_mileage, next_service_mileage, next_gear_oil_mileage, next_tyre_mileage, next_brake_pad_mileage, status, track_insurance,
            car_catalog:catalog_id ( make, model )
        `)
        .in("status", ["available", "rented", "maintenance", "website-display-only"])
        .eq("track_insurance", true)
        .order("plate_number", { ascending: true });

    if (error) {
        console.error("Maintenance fetch error:", error);
        return <div className="p-8 text-red-500">Failed to load car data.</div>;
    }

    // Transform and calculate urgency
    let rows: CarMaintenanceRow[] = (cars || []).map((c) => {
        const cur = c.current_mileage ?? 0;
        const nServ = c.next_service_mileage ?? (cur + 10000);
        const nGear = c.next_gear_oil_mileage ?? (cur + 40000);
        const nTyre = c.next_tyre_mileage ?? (cur + 10000);
        const nBrake = c.next_brake_pad_mileage ?? (cur + 30000);

        const cat = (c as any).car_catalog;
        const label = [cat?.make, cat?.model].filter(Boolean).join(" ") || "Unknown";

        // Closest threshold
        const urgency = Math.min(
            nServ - cur,
            nGear - cur,
            nTyre - cur,
            nBrake - cur
        );

        return {
            id: c.id,
            plate_number: c.plate_number,
            car_type: label,
            current_mileage: cur,
            next_service_mileage: nServ,
            next_gear_oil_mileage: nGear,
            next_tyre_mileage: nTyre,
            next_brake_pad_mileage: nBrake,
            status: c.status,
            track_insurance: !!c.track_insurance,
            urgency, // for sorting
        } as any;
    });

    // Filtering
    if (q) {
        rows = rows.filter(r =>
            r.plate_number.toLowerCase().includes(q) ||
            r.car_type?.toLowerCase().includes(q)
        );
    }
    if (plateFilter) {
        rows = rows.filter(r => r.plate_number === plateFilter);
    }

    // Sorting: Closest to threshold first
    rows.sort((a, b) => (a as any).urgency - (b as any).urgency);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <Wrench size={28} />
                        </div>
                        Maintenance Control
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-lg ml-2 font-black border border-amber-200">
                            {rows.length} VEHICLES
                        </span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium pl-14">
                        Fleet Health & Service Intervals
                    </div>
                </div>
            </div>

            {/* FILTER PANEL - Style matching Agreements */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
                <MaintenanceFilters initialQ={q} initialPlate={plateFilter} plates={(cars || []).map(c => c.plate_number)} />
            </div>

            <MaintenanceTable rows={rows} />
        </div>
    );
}

// Client component for filters to avoid full reload on every keystroke if needed, 
// but for now keeping it simple with form or router navigation
function MaintenanceFilters({ initialQ, initialPlate, plates }: any) {
    return (
        <form method="GET" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-2">
                <label className={labelClass}>Search Plate / Model</label>
                <div className="relative">
                    <input
                        name="q"
                        defaultValue={initialQ}
                        placeholder="Search..."
                        className={`${inputClass} pl-10`}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                </div>
            </div>
            <div className="col-span-1">
                <label className={labelClass}>Plate Number</label>
                <select name="plate" defaultValue={initialPlate} className={inputClass} >
                    <option value="">All Cars</option>
                    {Array.from(new Set(plates)).map((p: any) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>
            <div className="col-span-1 flex items-end">
                <Button variant="empty" type="submit" className="w-full bg-amber-600 hover:bg-pink-700 text-white font-bold h-10 shadow-md shadow-amber-100 uppercase text-[10px] tracking-widest">
                    Apply
                </Button>
            </div>
        </form>
    )
}
