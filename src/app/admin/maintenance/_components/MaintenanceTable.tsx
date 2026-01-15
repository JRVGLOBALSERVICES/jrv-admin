"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    Car,
    Gauge,
    Edit,
    Droplets,
    Settings2,
    Disc,
    LifeBuoy,
    AlertCircle,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import UpdateMileageModal from "./UpdateMileageModal";

// --- TYPES ---
export type CarMaintenanceRow = {
    id: string;
    plate_number: string;
    car_type: string;
    current_mileage: number;
    next_service_mileage: number;
    next_gear_oil_mileage: number;
    next_tyre_mileage: number;
    next_brake_pad_mileage: number;
    status: string;
};

// --- HELPERS ---
function getStatusTheme(diff: number) {
    if (diff <= 100) return {
        bg: "bg-linear-to-br from-red-500 to-rose-600 text-white border-red-200 animate-pulse shadow-lg shadow-red-200/50",
        label: "CRITICAL",
        iconCls: "text-white"
    };
    if (diff <= 1000) return {
        bg: "bg-linear-to-br from-orange-400 to-amber-500 text-white border-orange-200 shadow-md shadow-orange-100",
        label: "URGENT",
        iconCls: "text-white"
    };
    if (diff <= 3000) return {
        bg: "bg-linear-to-br from-amber-50 to-orange-50 text-amber-900 border-amber-100",
        label: "UPCOMING",
        iconCls: "text-amber-600"
    };
    if (diff <= 6000) return {
        bg: "bg-linear-to-br from-blue-50 to-indigo-50 text-indigo-900 border-indigo-100",
        label: "MONITOR",
        iconCls: "text-indigo-600"
    };
    return {
        bg: "bg-linear-to-br from-emerald-50 to-teal-50 text-emerald-900 border-emerald-100",
        label: "HEALTHY",
        iconCls: "text-emerald-600"
    };
}

function PriorityAlertList({ rows, onUpdate }: { rows: CarMaintenanceRow[], onUpdate: any }) {
    // Find cars with ANY maintenance item < 3000km
    const urgentItems = rows.flatMap(car => {
        const items = [
            { label: "Engine Oil", distance: car.next_service_mileage - car.current_mileage, target: car.next_service_mileage },
            { label: "Gear Oil", distance: car.next_gear_oil_mileage - car.current_mileage, target: car.next_gear_oil_mileage },
            { label: "Tyres", distance: car.next_tyre_mileage - car.current_mileage, target: car.next_tyre_mileage },
            { label: "Brake Pads", distance: car.next_brake_pad_mileage - car.current_mileage, target: car.next_brake_pad_mileage },
        ];
        return items
            .filter(item => item.distance < 4000)
            .map(item => ({ ...item, car }));
    }).sort((a, b) => a.distance - b.distance);

    if (urgentItems.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
                <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg shadow-red-200">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none">High Priority Alerts</h3>
                    <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-widest">Action Required Soon</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-red-100 overflow-hidden shadow-xl shadow-red-50/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-red-50/50 border-b border-red-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-red-600 uppercase tracking-widest">Vehicle</th>
                                <th className="px-6 py-4 text-[10px] font-black text-red-600 uppercase tracking-widest">Service Required</th>
                                <th className="px-6 py-4 text-[10px] font-black text-red-600 uppercase tracking-widest text-right">Distance Remaining</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                            {urgentItems.map((item, idx) => {
                                const isCritical = item.distance < 500;
                                return (
                                    <tr key={`${item.car.id}-${idx}`} className="hover:bg-red-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 group-hover:text-red-600 transition-colors">{item.car.plate_number}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{item.car.car_type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                                {item.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-lg font-mono font-black ${isCritical ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                                                {item.distance <= 0 ? 0 : item.distance.toLocaleString()} <span className="text-[10px]">km</span>
                                            </div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Target: {item.target.toLocaleString()} km</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => onUpdate(item.car)}
                                                className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all cursor-pointer"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MiniProgress({ label, current, target, interval, barColor }: any) {
    const diff = target - current;
    const percentage = Math.max(0, Math.min(100, (diff / interval) * 100));
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest leading-none">
                <span className="text-gray-500/80">{label}</span>
                <span className={percentage < 20 ? 'text-red-600' : 'text-indigo-600'}>{Math.round(percentage)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-200/30 rounded-full overflow-hidden p-0.5 border border-gray-200/50 shadow-inner">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${percentage < 10 ? 'bg-red-500 animate-pulse' :
                        percentage < 30 ? 'bg-orange-400' :
                            barColor
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function CategorySection({ title, icon: Icon, cars, type, onUpdate, isHealthy }: any) {
    if (cars.length === 0) return null;

    const iconColor = isHealthy ? "text-emerald-500" : "text-red-600";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 px-1">
                <div className="p-2.5 bg-linear-to-br from-gray-900 to-gray-700 rounded-xl text-white shadow-lg shadow-gray-200">
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter leading-none">{title}</h3>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        {cars.length} Vehicles Requiring Attention
                    </div>
                </div>
                <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent ml-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cars.map((car: CarMaintenanceRow) => {
                    const target = car[type as keyof CarMaintenanceRow] as number;
                    const diff = target - car.current_mileage;
                    const theme = getStatusTheme(diff);

                    const getInterval = () => {
                        if (type === "next_service_mileage") return 10000;
                        if (type === "next_gear_oil_mileage") return 20000;
                        if (type === "next_tyre_mileage") return 30000;
                        if (type === "next_brake_pad_mileage") return 15000;
                        return 10000;
                    };
                    const interval = getInterval();
                    const percentage = Math.max(0, Math.min(100, (diff / interval) * 100));

                    return (
                        <Card key={car.id} className="p-0 overflow-hidden border-0 shadow-2xl shadow-gray-200/40 hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 group rounded-3xl">
                            <div className="p-6 flex flex-col h-full bg-white relative">
                                <div className={`absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-all duration-500 pointer-events-none ${iconColor}`}>
                                    <Icon size={100} />
                                </div>

                                <div className="flex justify-between items-start mb-5 relative z-10">
                                    <div className="flex-1 mr-2">
                                        <div className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tighter leading-none">
                                            {car.plate_number}
                                        </div>
                                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1.5">
                                            {car.car_type}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100/50">
                                        <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 leading-none">Status</div>
                                        <div className="font-mono text-xs font-bold text-gray-800">{car.status?.toUpperCase() || "READY"}</div>
                                    </div>
                                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100/50">
                                        <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 leading-none">Target</div>
                                        <div className="font-mono text-xs font-bold text-gray-800">{target.toLocaleString()} <span className="text-[8px]">km</span></div>
                                    </div>
                                </div>

                                {/* MULTI-PROGRESS LIST */}
                                <div className="grid grid-cols-1 gap-y-4 mb-6 relative z-10 bg-gray-50/30 p-4 rounded-3xl border border-gray-100/50">
                                    <MiniProgress
                                        label="Engine Oil"
                                        current={car.current_mileage}
                                        target={car.next_service_mileage}
                                        interval={10000}
                                        barColor="bg-indigo-600"
                                    />
                                    <MiniProgress
                                        label="Gear Oil"
                                        current={car.current_mileage}
                                        target={car.next_gear_oil_mileage}
                                        interval={20000}
                                        barColor="bg-blue-600"
                                    />
                                    <MiniProgress
                                        label="Tyres"
                                        current={car.current_mileage}
                                        target={car.next_tyre_mileage}
                                        interval={30000}
                                        barColor="bg-emerald-600"
                                    />
                                    <MiniProgress
                                        label="Brake Pads"
                                        current={car.current_mileage}
                                        target={car.next_brake_pad_mileage}
                                        interval={15000}
                                        barColor="bg-amber-600"
                                    />
                                </div>

                                <div className="relative z-10 flex gap-3 items-stretch">
                                    <div className={`flex-1 p-4 rounded-2xl border ${theme.bg} transition-colors duration-500`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-[9px] uppercase font-black tracking-widest opacity-80">
                                                Remaining {title.split(' ')[0]} Distance
                                            </div>
                                            <Gauge size={12} className="opacity-60" />
                                        </div>
                                        <div className="text-3xl font-black font-mono tracking-tighter leading-none">
                                            {diff <= 0 ? 0 : diff.toLocaleString()} <span className="text-sm font-bold opacity-70">km</span>
                                        </div>
                                        {diff <= 0 && <div className="text-[10px] font-black uppercase mt-2 tracking-widest bg-white/20 rounded py-1 border border-white/30 text-center">SERVICE OVERDUE</div>}
                                    </div>

                                    <Button
                                        variant="indigoLight"
                                        size="sm"
                                        onClick={() => onUpdate(car)}
                                        className="p-6 w-14 rounded-2xl border-0 shadow-lg shadow-gray-200 transition-all flex items-center justify-center group/btn"
                                    >
                                        <Edit size={20} className="group-hover/btn:scale-110 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

export default function MaintenanceTable({ rows }: { rows: CarMaintenanceRow[] }) {
    const [selectedCar, setSelectedCar] = useState<CarMaintenanceRow | null>(null);

    // Split into categories
    // We list car in a category if it's "Upcoming" (< 5000km) or user specified we split into 4 categories.
    // Actually, to make it simple and clean, let's group by the "Most Urgent" category for each car, 
    // or just show 4 distinct sections as requested.

    // Expanded logic: Show cars if they are within a reasonable service window (Upcoming/Monitor)
    // Engine Oil: Show if due within 8000km (extended from 5000)
    // Gear Oil: Show if due within 15000km (extended from 10000)
    // Tyres: Show if due within 10000km (extended from 5000)
    // Brakes: Show if due within 5000km (extended from 3000)

    const engineOilCars = rows.filter(r => (r.next_service_mileage - r.current_mileage) < 8000);
    const gearOilCars = rows.filter(r => (r.next_gear_oil_mileage - r.current_mileage) < 15000);
    const tyreCars = rows.filter(r => (r.next_tyre_mileage - r.current_mileage) < 10000);
    const brakeCars = rows.filter(r => (r.next_brake_pad_mileage - r.current_mileage) < 5000);

    // For the "Healthy" view (only those truly far away)
    const allOtherCars = rows.filter(r =>
        !engineOilCars.includes(r) &&
        !gearOilCars.includes(r) &&
        !tyreCars.includes(r) &&
        !brakeCars.includes(r)
    );

    return (
        <div className="space-y-16">
            <PriorityAlertList rows={rows} onUpdate={setSelectedCar} />

            <CategorySection
                title="Engine Oil Service"
                icon={Droplets}
                cars={engineOilCars}
                type="next_service_mileage"
                onUpdate={setSelectedCar}
            />

            <CategorySection
                title="Gearbox Oil Service"
                icon={Settings2}
                cars={gearOilCars}
                type="next_gear_oil_mileage"
                onUpdate={setSelectedCar}
            />

            <CategorySection
                title="Brake Pad Replacement"
                icon={Disc}
                cars={brakeCars}
                type="next_brake_pad_mileage"
                onUpdate={setSelectedCar}
            />

            <CategorySection
                title="Tyre Change / Rotation"
                icon={LifeBuoy}
                cars={tyreCars}
                type="next_tyre_mileage"
                onUpdate={setSelectedCar}
            />

            {/* FOOTER / OTHER CARS */}
            {allOtherCars.length > 0 && (
                <CategorySection
                    title="Healthy Fleet"
                    icon={CheckCircle2}
                    cars={allOtherCars}
                    type="next_service_mileage"
                    onUpdate={setSelectedCar}
                    isHealthy
                />
            )}

            {selectedCar && (
                <UpdateMileageModal
                    car={selectedCar}
                    onClose={() => {
                        setSelectedCar(null);
                        // Use window.location.reload() or a more sophisticated state refresh
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
