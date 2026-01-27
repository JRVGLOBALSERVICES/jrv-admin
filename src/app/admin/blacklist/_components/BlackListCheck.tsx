"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Trash2, Plus, ShieldAlert, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

type BlacklistItem = {
  id: string;
  type: "mobile" | "ic";
  value: string;
  reason: string;
  created_at: string;
};

export default function BlacklistPage() {
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "mobile", value: "", reason: "" });

  // ✅ Search State
  const [searchTerm, setSearchTerm] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/admin/blacklist/api");
    const json = await res.json();
    if (json.ok) setItems(json.rows || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const add = async () => {
    if (!form.value) return alert("Enter value");
    await fetch("/admin/blacklist/api", {
      method: "POST",
      body: JSON.stringify({ action: "create", ...form }),
    });
    setForm({ type: "mobile", value: "", reason: "" });
    fetchItems();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    await fetch("/admin/blacklist/api", {
      method: "POST",
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchItems();
  };

  // ✅ Filtering Logic
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (i) =>
        i.value.toLowerCase().includes(lower) ||
        (i.reason || "").toLowerCase().includes(lower)
    );
  }, [items, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Blacklist Manager
          </h1>
        </div>
      </div>

      <Card title="Add New Entry">
        <div className="flex flex-col md:flex-row gap-3 p-4">
          <select
            className="border p-2 rounded bg-gray-50 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="mobile">Mobile Number</option>
            <option value="ic">IC / Passport</option>
          </select>
          <input
            className="border p-2 rounded flex-1 text-sm"
            placeholder="Value (e.g. +60123... or 9010...)"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <input
            className="border p-2 rounded flex-1 text-sm"
            placeholder="Reason (Optional)"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          <Button variant="danger" onClick={add}>
            Add New Blacklist
          </Button>
        </div>
      </Card>

      {/* ✅ Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all shadow-sm"
          placeholder="Search blacklist by number, IC, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 uppercase text-gray-500 font-semibold border-b">
            <tr>
              <th className="p-3 w-32">Type</th>
              <th className="p-3">Value</th>
              <th className="p-3">Reason</th>
              <th className="p-3 w-32">Date</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-red-50/30 transition-colors group"
              >
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.type === "mobile"
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-purple-50 text-purple-700 border-purple-100"
                      }`}
                  >
                    {item.type}
                  </span>
                </td>
                <td className="p-3 font-mono font-bold text-gray-800">
                  {item.value}
                </td>
                <td className="p-3 text-gray-600 italic">
                  {item.reason || "-"}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => remove(item.id)}
                    className="text-gray-300 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!filteredItems.length && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400">
                  {searchTerm ? "No matches found." : "Blacklist is empty."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
