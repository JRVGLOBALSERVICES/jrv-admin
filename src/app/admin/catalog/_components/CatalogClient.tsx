"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Upload, X, Car, Image as ImageIcon } from "lucide-react";
import { createCatalogEntry, updateCatalogEntry } from "../actions";
import { uploadImage } from "@/lib/upload";

type CatalogRow = {
    id: string;
    make: string | null;
    model: string | null;
    default_images: string | null;
};

const getBrandGradient = (make: string) => {
    const m = make.toLowerCase();
    if (m.includes("toyota")) return "bg-gradient-to-b from-red-600 to-red-800 shadow shadow-red-500/30";
    if (m.includes("honda")) return "bg-gradient-to-b from-red-500 to-red-700 shadow shadow-red-500/30"; // Honda red
    if (m.includes("bmw")) return "bg-gradient-to-b from-blue-500 to-cyan-500 shadow shadow-blue-500/30";
    if (m.includes("mercedes")) return "bg-gradient-to-b from-slate-300 to-slate-500 shadow shadow-slate-400/30";
    if (m.includes("audi")) return "bg-gradient-to-b from-slate-800 to-black shadow shadow-black/30";
    if (m.includes("porsche")) return "bg-gradient-to-b from-yellow-500 to-amber-600 shadow shadow-yellow-500/30";
    if (m.includes("ferrari")) return "bg-gradient-to-b from-red-600 to-rose-700 shadow shadow-red-500/30";
    if (m.includes("lamborghini")) return "bg-gradient-to-b from-yellow-400 to-yellow-600 shadow shadow-yellow-500/30";
    if (m.includes("tesla")) return "bg-gradient-to-b from-red-500 to-rose-600 shadow shadow-red-500/30";
    if (m.includes("mazda")) return "bg-gradient-to-b from-red-700 to-red-900 shadow shadow-red-800/30";
    if (m.includes("volvo")) return "bg-gradient-to-b from-blue-700 to-blue-900 shadow shadow-blue-800/30";
    if (m.includes("ford")) return "bg-gradient-to-b from-blue-600 to-blue-800 shadow shadow-blue-500/30";
    if (m.includes("nissan")) return "bg-gradient-to-b from-red-500 to-orange-600 shadow shadow-red-500/30";
    if (m.includes("perodua")) return "bg-gradient-to-b from-emerald-500 to-emerald-700 shadow shadow-emerald-500/30"; // Green for Perodua
    if (m.includes("proton")) return "bg-gradient-to-b from-orange-500 to-red-600 shadow shadow-orange-500/30";
    if (m.includes("range")) return "bg-gradient-to-b from-blue-500 to-purple-600 shadow shadow-orange-500/30";
    ``
    // Default diverse palette based on first char charCode
    const colors = [
        "bg-gradient-to-b from-indigo-500 to-purple-600 shadow shadow-indigo-500/30",
        "bg-gradient-to-b from-pink-500 to-rose-600 shadow shadow-pink-500/30",
        "bg-gradient-to-b from-amber-400 to-orange-500 shadow shadow-amber-500/30",
        "bg-gradient-to-b from-teal-400 to-emerald-600 shadow shadow-teal-500/30",
        "bg-gradient-to-b from-cyan-400 to-blue-600 shadow shadow-cyan-500/30",
    ];
    return colors[m.charCodeAt(0) % colors.length];
};

export default function CatalogClient({ data }: { data: CatalogRow[] }) {
    const [editingRow, setEditingRow] = useState<CatalogRow | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [search, setSearch] = useState("");

    // Group by Make
    const grouped = data.reduce((acc, row) => {
        const make = row.make || "Unknown";
        if (!acc[make]) acc[make] = [];
        acc[make].push(row);
        return acc;
    }, {} as Record<string, CatalogRow[]>);

    // Sort makes
    const sortedMakes = Object.keys(grouped).sort();

    // Filter logic
    const filteredMakes = sortedMakes.filter(make => {
        if (make.toLowerCase().includes(search.toLowerCase())) return true;
        const models = grouped[make];
        return models.some(m => m.model?.toLowerCase().includes(search.toLowerCase()));
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-black/5 outline-none"
                            placeholder="Search make or model..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="p-6 bg-black text-white hover:bg-gray-900">
                    <Plus className="w-4 h-4 mr-2" /> Add New Model
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {filteredMakes.map(make => (
                    <div key={make} className="space-y-3">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                            <span className={`w-1.5 h-6 rounded-full ${getBrandGradient(make)}`}></span>
                            {make}
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {grouped[make].length} models
                            </span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {grouped[make]
                                .filter(m => !search || m.model?.toLowerCase().includes(search.toLowerCase()) || make.toLowerCase().includes(search.toLowerCase()))
                                .map(row => (
                                    <button
                                        key={row.id}
                                        onClick={() => setEditingRow(row)}
                                        className="group relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-3 overflow-hidden text-left w-full hover:border-black/10"
                                    >
                                        <div className="w-16 h-12 bg-gray-50 rounded-lg shrink-0 border border-gray-100 flex items-center justify-center overflow-hidden">
                                            {row.default_images ? (
                                                <img src={row.default_images} className="w-full h-full object-cover" />
                                            ) : (
                                                <Car className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-gray-900 truncate">{row.model}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                ID: {row.id.slice(0, 4)}
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 font-bold ml-auto">Edit</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    </div>
                ))}

                {filteredMakes.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No models found matching "{search}"
                    </div>
                )}
            </div>

            {isAddOpen && <CatalogModal onClose={() => setIsAddOpen(false)} />}
            {editingRow && (
                <CatalogModal
                    onClose={() => setEditingRow(null)}
                    initialData={editingRow}
                />
            )}
        </div>
    );
}

function CatalogModal({ onClose, initialData }: { onClose: () => void, initialData?: CatalogRow }) {
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [make, setMake] = useState(initialData?.make ?? "");
    const [model, setModel] = useState(initialData?.model ?? "");

    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState(initialData?.default_images ?? "");

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            let imageUrl = initialData?.default_images || "";

            // If user selected a new file, upload it
            if (image) {
                imageUrl = await uploadImage(image);
            }

            const fd = new FormData();
            fd.append("make", make);
            fd.append("model", model);
            fd.append("default_images", imageUrl);

            if (isEdit && initialData) {
                fd.append("id", initialData.id);
                await updateCatalogEntry(fd);
            } else {
                await createCatalogEntry(fd);
            }

            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg">{isEdit ? "Edit Model" : "Add New Model"}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500">Make</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5"
                            placeholder="e.g. Toyota"
                            value={make}
                            onChange={e => setMake(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500">Model</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5"
                            placeholder="e.g. Vios"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500">Default Image</label>
                        <div className="relative group cursor-pointer border-2 border-dashed border-gray-200 rounded-xl h-40 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-50/80 transition-colors overflow-hidden">
                            {preview ? (
                                <img src={preview} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs">Click to upload</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImage} />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={loading} loading={loading} className="w-full bg-black hover:bg-gray-900 text-white py-6 text-base font-bold rounded-xl shadow-lg shadow-gray-200">
                            {loading ? "Saving..." : (isEdit ? "Save Changes" : "Create Model")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
