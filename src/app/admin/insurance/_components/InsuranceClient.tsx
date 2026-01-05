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

  if (days < 0) return { color: "red", days, label: `Expired ${Math.abs(days)} days ago` };
  if (days <= 7) return { color: "red", days, label: `Expiring in ${days} days` };
  if (days <= 30) return { color: "orange", days, label: `Expiring in ${days} days` };
  if (days <= 60) return { color: "yellow", days, label: `Expiring in ${days} days` };
  if (days <= 90) return { color: "blue", days, label: `Expiring in ${days} days` };
  return { color: "green", days, label: `OK (${days} days)` };
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
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${colors[status.color]} whitespace-nowrap`}>
      {status.label}
    </span>
  );
}

export function InsuranceClient({ cars }: { cars: CarData[] }) {
  const [loading, setLoading] = useState(false);

  // Grouping logic
  // We want to show "Upcoming Renewals" primarily.
  // Let's flatten the list to objects of { car, type: 'Insurance' | 'Roadtax', date, days }
  // Only keep those expiring in next 60 days for the "Alerts" section?
  // Or just show all cars in a table, sorted by nearest expiry.

  const allExpiryEvents: any[] = [];
  for (const c of cars) {
    if (c.insurance_expiry) {
      allExpiryEvents.push({ ...c, type: "Insurance", date: c.insurance_expiry, status: getStatus(c.insurance_expiry) });
    }
    else {
      // Add dummy entry if missing? No, detailed view handled elsewhere.
      allExpiryEvents.push({ ...c, type: "Insurance", date: null, status: getStatus(undefined) });
    }

    if (c.roadtax_expiry) {
      allExpiryEvents.push({ ...c, type: "Roadtax", date: c.roadtax_expiry, status: getStatus(c.roadtax_expiry) });
    } else {
      allExpiryEvents.push({ ...c, type: "Roadtax", date: null, status: getStatus(undefined) });
    }
  }

  // Sort by urgency (days ascending). Nulls/Greens at bottom.
  allExpiryEvents.sort((a, b) => {
    const da = a.status.days ?? 9999;
    const db = b.status.days ?? 9999;
    return da - db;
  });

  const urgent = allExpiryEvents.filter(e => e.status.color === "red" || e.status.color === "orange");
  const upcoming = allExpiryEvents.filter(e => e.status.color === "yellow" || e.status.color === "blue");
  const okay = allExpiryEvents.filter(e => e.status.color === "green" || e.status.color === "gray");

  const triggerSlack = async () => {
    console.log("Triggering Slack Notification...");
    setLoading(true);
    try {
      const res = await fetch("/admin/insurance/api/notify", { method: "POST" });
      console.log("Response Status:", res.status);

      const text = await res.text();
      console.log("Response Text:", text);

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        alert("Failed to parse server response: " + text.substring(0, 100));
        return;
      }

      if (json.ok) {
        alert(`Notification sent! (${json.count} cars)`);
      } else {
        alert(`Failed: ${json.error}\n\nDebug: Webhook Defined? ${json.debug?.webhookDefined ? "YES" : "NO"}\nCars Found: ${json.debug?.carsFound}`);
      }
    } catch (e: any) {
      console.error("Fetch Error:", e);
      alert("Error sending notification: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" /> Insurance & Roadtax
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Track expiry dates for your fleet.
          </p>
        </div>
        <Button
          onClick={triggerSlack}
          loading={loading}
          className="p-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200"
        >
          <Bell className="w-4 h-4 mr-2" /> Notify Slack
        </Button>
      </div>

      {/* Urgent Grid */}
      {urgent.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Urgent Attention Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgent.map((item, i) => (
              <Link
                key={i}
                href={`/admin/cars/${item.id}`}
                className="bg-white rounded-xl border border-red-100 shadow-xl shadow-red-100/50 p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-red-300 transition-all cursor-pointer"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${item.status.color === 'red' ? 'bg-red-500' : 'bg-orange-500'}`} />

                <div className="flex justify-between items-start pl-3">
                  <div>
                    <div className="text-xl font-black text-gray-900 group-hover:text-red-700 transition-colors">{item.plate}</div>
                    <div className="text-xs text-gray-500 font-bold uppercase">{item.make} {item.model}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-red-50 transition-colors">
                    {item.type === "Insurance" ? <CheckCircle className="w-5 h-5 text-indigo-400" /> : <Car className="w-5 h-5 text-emerald-400" />}
                  </div>
                </div>

                <div className="pl-3 mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase">{item.type} Expiry</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{item.date}</div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming List */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          Upcoming (Next 90 Days)
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {upcoming.length === 0 && <div className="p-8 text-center text-gray-400 italic">No upcoming renewals in next 90 days.</div>}
          {upcoming.map((item, i) => (
            <Link
              key={i}
              href={`/admin/cars/${item.id}`}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors gap-2 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${item.type === 'Insurance' ? 'bg-indigo-300' : 'bg-emerald-300'}`} />
                <div>
                  <div className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{item.plate}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{item.make} {item.model} • {item.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">{item.date}</span>
                <StatusBadge status={item.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Good Status (Collapsed or Table) */}
      <section className="space-y-4">
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors flex items-center gap-2">
            <span>Show All Cars ({okay.length})</span>
            <div className="h-px bg-gray-200 flex-1" />
          </summary>
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {okay.map((item, i) => (
              <Link
                key={i}
                href={`/admin/cars/${item.id}`}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-gray-50 gap-2 opacity-75 hover:opacity-100 hover:bg-gray-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <div>
                    <div className="font-bold text-gray-700 text-sm group-hover:text-indigo-600 transition-colors">{item.plate}</div>
                    <div className="text-[10px] text-gray-400 uppercase">{item.make} {item.model} • {item.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{item.date || "N/A"}</span>
                  <StatusBadge status={item.status} />
                </div>
              </Link>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
