"use client";

type CarRow = {
  id: string;
  plate_number: string | null;
  location: string | null;
  make?: string | null;
  model?: string | null;
};

export default function AvailableNow({
  title,
  rows,
}: {
  title: string;
  rows: CarRow[];
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-emerald-50">
        <div className="font-bold text-emerald-900">{title}</div>
        <span className="text-xs text-emerald-800 font-semibold">
          {rows.length}
        </span>
      </div>

      {!rows.length ? (
        <div className="p-6 text-sm opacity-60 text-center">No cars.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.slice(0, 8).map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">{c.plate_number}</div>
                <div className="text-xs text-gray-500">
                  {(c.make || "").trim()} {(c.model || "").trim()}
                  {c.location ? ` • ${c.location}` : ""}
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded">
                available
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
