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
  const [showUntracked, setShowUntracked] = useState(false);

  // 1. Filter Logic
  const allTracked = cars.filter(c => c.track_insurance !== false);
  const untracked = cars.filter(c => c.track_insurance === false);

  const basePool = showUntracked ? cars : allTracked;

  const missingDocs = basePool.filter(c => !c.insurance_expiry && !c.roadtax_expiry);
  const withData = basePool.filter(c => c.insurance_expiry || c.roadtax_expiry);

  // 2. Sorting by Urgency
  const getMinDays = (c: CarData) => {
    let d1 = c.insurance_expiry ? differenceInDays(parseISO(c.insurance_expiry), new Date()) : 9999;
    let d2 = c.roadtax_expiry ? differenceInDays(parseISO(c.roadtax_expiry), new Date()) : 9999;
    return Math.min(d1, d2);
  };

  withData.sort((a, b) => {
    const da = getMinDays(a);
    const db = getMinDays(b);
    if (da !== db) return da - db;
    return a.plate.localeCompare(b.plate);
  });

  const expired = withData.filter(c => getMinDays(c) < 0);

  // 3. Display Set
  let displayCars = withData;
  if (activeTab === "expired") displayCars = expired;
  if (activeTab === "missing") displayCars = missingDocs.sort((a, b) => a.plate.localeCompare(b.plate));

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

  const StatBox = ({ label, value, color, onClick, active }: any) => (
    <button
      onClick={onClick}
      className={`flex-1 p-5 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden group ${active
        ? `bg-white border-${color}-200 shadow-xl shadow-${color}-100 scale-[1.02] ring-2 ring-${color}-500/10`
        : `bg-white/50 border-gray-100 hover:border-${color}-200 hover:bg-white`
        }`}
    >
      <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? `text-${color}-600` : 'text-gray-400'}`}>
        {label}
      </div>
      <div className={`text-3xl font-black tabular-nums ${active ? 'text-gray-900' : 'text-gray-600'}`}>
        {value}
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity`}>
        <Car className="w-24 h-24" />
      </div>
    </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* 1. STATE-OF-THE-ART HEADER */}
      <div className="space-y-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-widest shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Fleet Compliance Dashboard
            </div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
              Insurance & <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">Roadtax</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              {expired.length > 0 ? (
                <span className="flex items-center gap-2">
                  Critical: <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg font-bold">{expired.length} vehicles</span> require immediate attention.
                </span>
              ) : (
                "All tracked vehicles are currently compliant and up-to-date."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-3 rounded-4xl border border-gray-200/50 shadow-sm px-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setShowUntracked(!showUntracked)}
                  className={`w-12 h-7 rounded-full transition-all relative ${showUntracked ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-md ${showUntracked ? 'left-6' : 'left-1'}`} />
                </div>
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Show All Fleet</span>
              </label>
            </div>

            <Button
              onClick={triggerSlack}
              loading={loading}
              className="h-14 px-10 bg-gray-900 hover:bg-black text-white font-black rounded-4xl shadow-2xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 border-0 active:translate-y-0.5"
            >
              <Bell className="w-5 h-5" /> Sync to Slack
            </Button>
          </div>
        </div>

        {/* KPI CARDS AS TABS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox
            label="Monitored Fleet"
            value={basePool.length}
            color="indigo"
            onClick={() => setActiveTab("all")}
            active={activeTab === 'all'}
          />
          <StatBox
            label="Expired Items"
            value={expired.length}
            color="rose"
            onClick={() => setActiveTab("expired")}
            active={activeTab === 'expired'}
          />
          <StatBox
            label="Missing Data"
            value={missingDocs.length}
            color="amber"
            onClick={() => setActiveTab("missing")}
            active={activeTab === 'missing'}
          />
        </div>
      </div>

      {/* 2. FLEET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayCars.map((item) => {
          const insStatus = getStatus(item.insurance_expiry);
          const rtStatus = getStatus(item.roadtax_expiry);

          return (
            <Link
              key={item.id}
              href={`/admin/cars/${item.id}`}
              className="group relative bg-white rounded-4xl border border-gray-100 p-6 flex flex-col gap-6 transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/50 hover:border-indigo-100 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                    {item.plate}
                    {item.track_insurance === false && (
                      <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm font-black tracking-widest uppercase">Untracked</span>
                    )}
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.make} • {item.model}</div>
                </div>
                {item.image ? (
                  <div className="w-16 h-12 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 rotate-2 group-hover:rotate-0 transition-transform">
                    <img src={item.image} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" alt={item.plate} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 border border-dashed border-gray-200">
                    <Car className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-3xl border transition-colors ${insStatus.color === 'red' ? 'bg-rose-50/50 border-rose-100' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Insurance</div>
                  <div className="font-bold text-gray-900 text-xs mb-3 tabular-nums">{item.insurance_expiry || "Missing"}</div>
                  <StatusBadge status={insStatus} />
                </div>
                <div className={`p-4 rounded-3xl border transition-colors ${rtStatus.color === 'red' ? 'bg-rose-50/50 border-rose-100' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Roadtax</div>
                  <div className="font-bold text-gray-900 text-xs mb-3 tabular-nums">{item.roadtax_expiry || "Missing"}</div>
                  <StatusBadge status={rtStatus} />
                </div>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {displayCars.length === 0 && (
        <div className="text-center py-32 space-y-4 bg-gray-50/50 rounded-6xl border-2 border-dashed border-gray-100">
          <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center text-gray-300 shadow-sm border border-gray-100">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="text-gray-400 font-bold uppercase tracking-widest text-xs">
            Clean Slate • No issues found in this list
          </div>
        </div>
      )}
    </div>
  );
}
