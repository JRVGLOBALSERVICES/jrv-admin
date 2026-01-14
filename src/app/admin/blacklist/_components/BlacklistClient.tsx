"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trash2, Plus, ShieldAlert, Search, PenLine, AlertTriangle, Check } from "lucide-react";
import { useRouter } from "next/navigation";

// --- TYPES ---
type BlacklistItem = {
    id: string;
    type: "mobile" | "ic";
    value: string;
    reason: string;
    created_at: string;
};

type FormData = {
    id?: string;
    type: "mobile" | "ic";
    value: string;
    reason: string;
};

const DEFAULT_FORM: FormData = { type: "mobile", value: "", reason: "" };

export default function BlacklistClient() {
    const router = useRouter();
    const [items, setItems] = useState<BlacklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
    const [isSaving, setIsSaving] = useState(false);

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- FETCHING ---
    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await fetch("/admin/blacklist/api");
            const json = await res.json();
            if (json.ok) setItems(json.rows || []);
        } catch (e) { console.error("Failed to fetch blacklist"); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // --- ACTIONS ---
    const handleEdit = (item: BlacklistItem) => {
        setFormData({
            id: item.id,
            type: item.type,
            value: item.value,
            reason: item.reason
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setFormData(DEFAULT_FORM);
        setIsModalOpen(true);
    };

    const save = async () => {
        if (!formData.value.trim()) return alert("Value is required");

        setIsSaving(true);
        try {
            const method = formData.id ? "PUT" : "POST";
            const res = await fetch("/admin/blacklist/api", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const json = await res.json();

            if (json.ok) {
                fetchItems();
                setIsModalOpen(false);
            } else {
                alert(json.error || "Failed to save");
            }
        } catch (e) { alert("An error occurred"); }
        finally { setIsSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/admin/blacklist/api?id=${deleteId}`, { method: "DELETE" });
            if (res.ok) {
                setItems(items.filter(i => i.id !== deleteId));
                setDeleteId(null);
            } else {
                alert("Failed to delete");
            }
        } catch (e) { alert("Error deleting"); }
        finally { setIsDeleting(false); }
    };


    // --- FILTERING ---
    const filteredItems = useMemo(() => {
        let res = items;
        if (search.trim()) {
            const q = search.toLowerCase();
            res = res.filter(i =>
                i.value.toLowerCase().includes(q) ||
                (i.reason || "").toLowerCase().includes(q)
            );
        }
        return res;
    }, [items, search]);

    return (
        <div className="space-y-6 pt-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 md:px-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                        <h2 className="text-xl font-black text-gray-900">Blacklist Manager</h2>
                    </div>
                    <p className="text-sm text-gray-500">Manage blocked users (Mobile / IC).</p>
                </div>
                <Button
                    className="shadow-lg shadow-red-200 p-6 md:p-8"
                    variant="danger"
                    onClick={handleAddNew}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Entry
                </Button>
            </div>

            {/* Main Content */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        placeholder="Search by number, IC, or reason..."
                        className="w-full border-0 bg-gray-50/50 rounded-lg pl-10 pr-4 py-2.5 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-100 relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-32">Type</th>
                                    <th className="px-4 py-3">Value</th>
                                    <th className="px-4 py-3">Reason</th>
                                    <th className="px-4 py-3 w-32">Date Added</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/30 transition group">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${item.type === 'mobile'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-medium text-gray-900">
                                            {item.value}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {item.reason || <span className="text-gray-300 italic">No reason provided</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleEdit(item)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <PenLine className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => setDeleteId(item.id)}
                                                    className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                                            {loading ? "Loading entries..." : "No blacklist entries found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- ADD/EDIT MODAL --- */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={formData.id ? "Edit Entry" : "Add Blacklist Entry"}
                description={formData.id ? "Update details for this block entry." : "Block a new mobile number or IC."}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="p-6">Cancel</Button>
                        <Button variant="danger" onClick={save} disabled={isSaving} className="p-6">
                            {isSaving ? "Saving..." : "Save Entry"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Entry Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFormData({ ...formData, type: 'mobile' })}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${formData.type === 'mobile'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                Mobile Number
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, type: 'ic' })}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${formData.type === 'ic'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                IC / Passport
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                            {formData.type === 'mobile' ? 'Mobile Number' : 'IC / Passport Number'}
                        </label>
                        <input
                            className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all outline-none"
                            placeholder={formData.type === 'mobile' ? "e.g. +6012345678" : "e.g. 901010-10-1234"}
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Reason (Optional)</label>
                        <textarea
                            className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all outline-none resize-none h-20"
                            placeholder="Why is this user blacklisted?"
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>

                    <div className="bg-amber-50 rounded-lg p-3 flex gap-3 items-start md:items-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800">
                            This will immediately block checkouts from users matching this details.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* --- DELETE MODAL --- */}
            <Modal
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Remove Entry?"
                description="Are you sure you want to remove this user from the blacklist?"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteId(null)} className="p-6">Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} className="p-6" disabled={isDeleting}>
                            {isDeleting ? "Removing..." : "Remove Entry"}
                        </Button>
                    </>
                }
            >
                <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
                    The user will be able to make bookings again immediately after removal.
                </div>
            </Modal>
        </div>
    );
}
