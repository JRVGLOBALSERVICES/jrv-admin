"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

export function LogToolbar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleActionFilter = (action: string) => {
    const params = new URLSearchParams(searchParams);
    if (action) {
      params.set("action", action);
    } else {
      params.delete("action");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.replace(pathname);
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          placeholder="Search Agreement ID or Email..."
          defaultValue={searchParams.get("q")?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Action Filter */}
      <div className="relative w-full sm:w-48">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
          onChange={(e) => handleActionFilter(e.target.value)}
          value={searchParams.get("action")?.toString() || ""}
        >
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="soft_deleted">Deleted</option>
          <option value="deposit_refunded_toggled">Deposit Toggled</option>
        </select>
      </div>

      {/* Clear Button */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> Clear
        </button>
      )}
    </div>
  );
}