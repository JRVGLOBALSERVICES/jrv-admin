"use client";

import { useState } from "react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, Bell, CheckCircle, Car } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CarData = {
  id: string;
  plate: string;
  make: string;
  model: string;
  image?: string;
  insurance_expiry?: string;
  roadtax_expiry?: string;
  track_insurance?: boolean;
};

// Helper to determine status color
// Red: < 7 days
// Orange: < 30 days
// Yellow: < 60 days
// Blue: < 90 days
function getStatus(dateStr?: string) {
  if (!dateStr) return { color: "gray", days: null, label: "No Date" };
  const d = parseISO(dateStr);
  const days = differenceInDays(d, new Date());

  if (days < 0) return { color: "red", days, label: `Expired (${Math.abs(days)}d)` };
  if (days <= 7) return { color: "red", days, label: `${days} Days Left` };
  if (days <= 30) return { color: "orange", days, label: `In ${days} Days` };
  if (days <= 60) return { color: "yellow", days, label: `In ${days} Days` };
  if (days <= 90) return { color: "blue", days, label: `In ${days} Days` };
  return { color: "green", days, label: `OK (${days}d)` };
}

function StatusBadge({ status }: { status: any }) {
  const colors: any = {
    red: "bg-red-100 text-red-700 border-red-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    gray: "bg-gray-100 text-gray-400 border-gray-200"
  };

  return (
    <span className={`px-2 py-1.5 rounded-md text-[10px] font-bold border uppercase block w-full text-center leading-tight ${colors[status.color]}`}>
      {status.label}
    </span>
  );
}

export function InsuranceClient({ cars }: { cars: CarData[] }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "expired" | "missing">("all");

  // 1. Filter Tracked
  const trackedCars = cars.filter(c => c.track_insurance !== false);

  // 2. Split Data vs Missing
  const missingVars = trackedCars.filter(c => !c.insurance_expiry && !c.roadtax_expiry);
  const withDataVars = trackedCars.filter(c => c.insurance_expiry || c.roadtax_expiry);

  // 3. Helper for Min Days (Urgency)
  const getMinDays = (c: CarData) => {
    let d1 = c.insurance_expiry ? differenceInDays(parseISO(c.insurance_expiry), new Date()) : 9999;
    let d2 = c.roadtax_expiry ? differenceInDays(parseISO(c.roadtax_expiry), new Date()) : 9999;
    return Math.min(d1, d2);
  };

  // 4. Sort withData by Urgency (Ascending: Expired -> Soon -> Late) -> Then Plate
  withDataVars.sort((a, b) => {
    const da = getMinDays(a);
    const db = getMinDays(b);
    if (da !== db) return da - db;
    return a.plate.localeCompare(b.plate);
  });

  // 5. Expired Set
  const expiredVars = withDataVars.filter(c => getMinDays(c) < 0);

  // 6. Display Logic
  let displayCars = withDataVars;
  if (activeTab === "expired") displayCars = expiredVars;
  if (activeTab === "missing") displayCars = missingVars.sort((a, b) => a.plate.localeCompare(b.plate));

  const triggerSlack = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/insurance/api/notify", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.ok) alert(`Notification sent! (${json.count} cars)`);
      else alert("Failed: " + (json.error || "Unknown error"));
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" /> Insurance & Roadtax
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Overview • Sorted by Urgency
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ALL ({withDataVars.length})
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              EXPIRED ({expiredVars.length})
            </button>
            <button
              onClick={() => setActiveTab("missing")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'missing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              MISSING ({missingVars.length})
            </button>
          </div>
          <Button
            onClick={triggerSlack}
            loading={loading}
            className="p-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 text-xs"
          >
            <Bell className="w-3 h-3 mr-2" /> Slack
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {displayCars.map((item) => {
          const insStatus = getStatus(item.insurance_expiry);
          const rtStatus = getStatus(item.roadtax_expiry);

          return (
            <Link
              key={item.id}
              href={`/admin/cars/${item.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all p-5 flex flex-col gap-5 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-xl text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.plate}</div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-1">{item.make} {item.model}</div>
                </div>
                {item.image && (
                  <div className="w-16 h-12 rounded-lg bg-gray-50 overflow-hidden border border-gray-100">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.plate} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${insStatus.color === 'red' || insStatus.color === 'orange' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <span>Insurance</span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm tabular-nums">{item.insurance_expiry || "—"}</div>
                  <StatusBadge status={insStatus} />
                </div>
                <div className={`p-3 rounded-xl border flex flex-col gap-1 ${rtStatus.color === 'red' || rtStatus.color === 'orange' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <span>Roadtax</span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm tabular-nums">{item.roadtax_expiry || "—"}</div>
                  <StatusBadge status={rtStatus} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {displayCars.length === 0 && (
        <div className="text-center py-20 text-gray-400 italic bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          No cars found in this list.
        </div>
      )}

    </div>
  );
}
