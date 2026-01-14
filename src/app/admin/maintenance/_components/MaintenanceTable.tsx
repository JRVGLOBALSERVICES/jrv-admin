"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
    Car,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Wrench,
    Gauge,
    Edit,
    Bell,
} from "lucide-react";
import UpdateMileageModal from "./UpdateMileageModal";

// --- TYPES ---
import { CarMaintenanceRow } from "./types";

// --- HELPERS ---
function getStatusColor(diff: number, type: "oil" | "part") {
    // Oil thresholds: 2000 (warn), 1000 (danger), 500 (critical), 100 (immediate)
    // For simplicity in UI table cell:
    // > 2000: Green
    // 1000 - 2000: Yellow
    // < 1000: Red
    if (type === "oil") {
        if (diff > 2000) return "bg-emerald-100 text-emerald-800 border-emerald-200";
        if (diff > 1000) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        return "bg-red-100 text-red-800 border-red-200 animate-pulse";
    }
    // Parts thresholds (15000 interval usually)
    // Let's say warn at 2000, danger at 0
    if (diff > 2000) return "bg-gray-50 text-gray-600 border-gray-100";
    if (diff > 0) return "bg-yellow-50 text-yellow-700 border-yellow-100";
    return "bg-red-50 text-red-700 border-red-100";
}

const getProgressColor = (percent: number) => {
    if (percent < 0) return "bg-red-500";
    if (percent < 10) return "bg-red-500";
    if (percent < 20) return "bg-orange-500";
    if (percent < 50) return "bg-yellow-500";
    return "bg-emerald-500";
}

function StatusBadge({
    label,
    current,
    target,
    type,
    interval
}: {
    label: string;
    current: number;
    target: number;
    type: "oil" | "part";
    interval: number; // e.g. 10000 for oil, 20000 for tyres
}) {
    const diff = target - current;
    const percent = Math.max(0, Math.min(100, (diff / interval) * 100));

    // Status Logic
    let statusText = `${diff.toLocaleString()} km left`;
    let statusColor = "text-gray-500";
    let bgColor = "bg-gray-50";

    if (diff <= 0) {
        statusText = "OVERDUE";
        statusColor = "text-red-600 font-bold";
        bgColor = "bg-red-50 border-red-100";
    } else if (diff < 2000) {
        statusText = "Due Soon";
        statusColor = "text-orange-600 font-bold";
        bgColor = "bg-orange-50 border-orange-100";
    }

    return (
        <div className={`flex flex-col p-3 rounded-xl border ${bgColor} transition-all hover:shadow-sm`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {label}
                </span>
                <span className={`text-[10px] ${statusColor}`}>
                    {statusText}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${getProgressColor(percent)}`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            <div className="mt-1 flex justify-between text-[9px] text-gray-400 font-mono">
                <span>{current.toLocaleString()}</span>
                <span>{target.toLocaleString()}</span>
            </div>
        </div>
    );
}

export default function MaintenanceTable({ rows }: { rows: CarMaintenanceRow[] }) {
    const [selectedCar, setSelectedCar] = useState<CarMaintenanceRow | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "due_soon">("all");
    const [showUntracked, setShowUntracked] = useState(false);
    const [selectedPlate, setSelectedPlate] = useState("");

    // Get unique sorted plates
    const allPlates = Array.from(new Set(rows.map(r => r.plate_number))).sort();

    // Filter Logic
    const filtered = rows.filter((car) => {
        // 1. Tracked Check
        if (!showUntracked && car.track_insurance === false) return false;

        // 2. Search
        const s = search.toLowerCase();
        const matchesSearch =
            car.plate_number.toLowerCase().includes(s) ||
            car.car_type.toLowerCase().includes(s);
        if (!matchesSearch) return false;

        // 3. Plate Filter
        if (selectedPlate && car.plate_number !== selectedPlate) return false;

        // 4. Status Filter
        if (statusFilter === "all") return true;

        const intervals = [
            { target: car.next_service_mileage, type: "oil" },
            { target: car.next_gear_oil_mileage, type: "oil" },
            { target: car.next_tyre_mileage, type: "part" },
            { target: car.next_brake_pad_mileage, type: "part" },
        ];

        const worstDiff = Math.min(...intervals.map(i => i.target - car.current_mileage));

        if (statusFilter === "overdue") return worstDiff <= 0;
        if (statusFilter === "due_soon") return worstDiff > 0 && worstDiff <= 2000;

        return true;
    });



    return (
        <div className="space-y-6">
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search plate or model..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-3 py-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="overdue">Overdue Only</option>
                        <option value="due_soon">Due Soon (≤ 2000km)</option>
                    </select>
                    <select
                        className="px-3 py-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                        value={selectedPlate}
                        onChange={(e: any) => setSelectedPlate(e.target.value)}
                    >
                        <option value="">All Plates</option>
                        {allPlates.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUntracked(!showUntracked)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${showUntracked ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    >
                        {showUntracked ? "Showing All Cars" : "Tracked Only"}
                    </button>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {filtered.length} Vehicles
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filtered.map((car) => (
                    <Card
                        key={car.id}
                        className="p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                        onClick={() => setSelectedCar(car)}
                    >
                        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                            {/* CAR INFO */}
                            <div className="shrink-0 w-full lg:w-48">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`p-2 rounded-full ${car.track_insurance === false ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Car size={16} />
                                    </div>
                                    <span className="font-bold text-gray-900 text-lg">
                                        {car.plate_number}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 font-medium pl-10 mb-2">
                                    {car.car_type}
                                </div>
                                <div className="pl-10 flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-50 py-1 px-2 rounded w-fit">
                                    <Gauge size={12} />
                                    Current: <strong className="text-gray-900">{car.current_mileage.toLocaleString()} km</strong>
                                </div>
                            </div>

                            {/* STATUS GRID */}
                            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                                <StatusBadge
                                    label="Service"
                                    current={car.current_mileage}
                                    target={car.next_service_mileage}
                                    type="oil"
                                    interval={10000}
                                />
                                <StatusBadge
                                    label="Gear Oil"
                                    current={car.current_mileage}
                                    target={car.next_gear_oil_mileage}
                                    type="oil"
                                    interval={40000}
                                />
                                <StatusBadge
                                    label="Tyres"
                                    current={car.current_mileage}
                                    target={car.next_tyre_mileage}
                                    type="part"
                                    interval={20000}
                                />
                                <StatusBadge
                                    label="Brakes"
                                    current={car.current_mileage}
                                    target={car.next_brake_pad_mileage}
                                    type="part"
                                    interval={20000}
                                />
                            </div>

                            {/* ACTION */}
                            <div className="shrink-0 lg:ml-auto">
                                <Button
                                    variant="emeraldGreen"
                                    className="p-6"
                                >
                                    <Edit size={14} /> <span className="hidden lg:inline">Update</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                {rows.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        No active cars found.
                    </div>
                )}
            </div>

            {selectedCar && (
                <UpdateMileageModal
                    car={selectedCar}
                    onClose={() => {
                        setSelectedCar(null);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
