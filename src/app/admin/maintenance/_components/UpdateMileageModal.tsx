"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CarMaintenanceRow } from "./MaintenanceTable";
import { X, Save, RefreshCw } from "lucide-react";

export default function UpdateMileageModal({
    car,
    onClose,
}: {
    car: CarMaintenanceRow;
    onClose: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [current, setCurrent] = useState(String(car.current_mileage));

    // Targets
    const [nextService, setNextService] = useState(String(car.next_service_mileage));
    const [nextGear, setNextGear] = useState(String(car.next_gear_oil_mileage));
    const [nextTyre, setNextTyre] = useState(String(car.next_tyre_mileage));
    const [nextBrake, setNextBrake] = useState(String(car.next_brake_pad_mileage));

    const save = async () => {
        setBusy(true);
        try {
            const res = await fetch("/admin/maintenance/api", {
                method: "POST",
                body: JSON.stringify({
                    action: "update_maintenance",
                    id: car.id,
                    current_mileage: Number(current),
                    next_service_mileage: Number(nextService),
                    next_gear_oil_mileage: Number(nextGear),
                    next_tyre_mileage: Number(nextTyre),
                    next_brake_pad_mileage: Number(nextBrake),
                }),
            });
            if (!res.ok) throw new Error("Failed to update");
            onClose();
        } catch (e) {
            alert("Error saving: " + e);
        } finally {
            setBusy(false);
        }
    };

    // Quick increments
    const addInterval = (setter: any, currentVal: string, amount: number) => {
        setter(String(Number(currentVal) + amount));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Update Maintenance: {car.plate_number}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Current Mileage */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1 block">
                            Current Odometer (km)
                        </label>
                        <input
                            type="number"
                            className="w-full text-2xl font-mono font-bold bg-white border border-blue-200 rounded-lg px-3 py-2 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                        />
                    </div>

                    {/* Thresholds */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">
                            Next Service Targets
                        </h4>

                        <ServiceRow
                            label="Engine Oil / General"
                            value={nextService}
                            onChange={setNextService}
                            onAdd={() => addInterval(setNextService, nextService, 10000)} // +10k
                        />
                        <ServiceRow
                            label="Gear Oil"
                            value={nextGear}
                            onChange={setNextGear}
                            onAdd={() => addInterval(setNextGear, nextGear, 20000)} // +20k
                        />
                        <ServiceRow
                            label="Tyres"
                            value={nextTyre}
                            onChange={setNextTyre}
                            onAdd={() => addInterval(setNextTyre, nextTyre, 30000)} // +30k
                        />
                        <ServiceRow
                            label="Brake Pads"
                            value={nextBrake}
                            onChange={setNextBrake}
                            onAdd={() => addInterval(setNextBrake, nextBrake, 15000)} // +15k
                        />

                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="emeraldGreen" onClick={onClose}>Cancel</Button>
                    <Button variant="indigoLight" onClick={save} loading={busy} className="p-7 font-bold h-11 px-6">
                        <Save size={16} className="mr-2" /> Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ServiceRow({ label, value, onChange, onAdd }: any) {
    return (
        <div className="grid grid-cols-[120px_1fr_auto] gap-2 items-center">
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <input
                type="number"
                className="w-full text-sm border rounded px-2 py-1.5 font-mono bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                onClick={onAdd}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                title="Add Interval (service done)"
            >
                <RefreshCw size={14} />
            </button>
        </div>
    )
}
