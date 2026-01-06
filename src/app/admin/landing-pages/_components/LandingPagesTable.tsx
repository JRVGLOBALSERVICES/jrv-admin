"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type LandingPage = {
    slug: string;
    menu_label: string;
    category: string;
    status: string;
};

export default function LandingPagesTable({ rows }: { rows: LandingPage[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const matchSearch =
                r.slug.toLowerCase().includes(search.toLowerCase()) ||
                r.menu_label.toLowerCase().includes(search.toLowerCase());

            const matchCategory = !categoryFilter || r.category === categoryFilter;
            const matchStatus = !statusFilter || (r.status || "active") === statusFilter;

            return matchSearch && matchCategory && matchStatus;
        });
    }, [rows, search, categoryFilter, statusFilter]);

    const categories = useMemo(() => {
        return Array.from(new Set(rows.map((r) => r.category))).sort();
    }, [rows]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                            Search Slug or Label
                        </label>
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                            Category
                        </label>
                        <select
                            className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner text-gray-800 h-10"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                            Status
                        </label>
                        <select
                            className="w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-xs md:text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner text-gray-800 h-10"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="deleted">Deleted</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center">
                    <span>Filtering {filtered.length} of {rows.length} pages</span>
                    {(search || categoryFilter || statusFilter) && (
                        <button
                            onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter(""); }}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Menu Label</th>
                                <th className="px-4 py-3">Slug</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((r) => (
                                <tr key={r.slug} className="hover:bg-indigo-50/30 transition group">
                                    <td className="px-4 py-3 font-bold text-gray-900">
                                        {r.menu_label}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">
                                        /{r.slug}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700">
                                            {r.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${r.status === "active"
                                                ? "bg-green-50 text-green-700 border border-green-200"
                                                : r.status === "deleted"
                                                    ? "bg-red-50 text-red-700 border border-red-200"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                                }`}
                                        >
                                            {r.status || "active"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/landing-pages/${r.slug}`}>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 text-xs px-3"
                                                >
                                                    Edit
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                                        No pages found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
